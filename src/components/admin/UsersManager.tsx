import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Key, UserX, Shield, ShieldOff } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  email?: string;
  isAdmin?: boolean;
}

interface UserBooking {
  id: string;
  booking_date: string;
  status: string;
  class_schedule_id: string;
}

interface AuthUser {
  id: string;
  email?: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

const UsersManager = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userBookings, setUserBookings] = useState<Record<string, UserBooking[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [adminActionUserId, setAdminActionUserId] = useState<string | null>(null);
  const [adminActionType, setAdminActionType] = useState<'grant' | 'revoke' | null>(null);
  const [isChangingAdmin, setIsChangingAdmin] = useState(false);
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get auth token for edge function call
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      let authUsers: AuthUser[] = [];
      let adminRoles: UserRole[] = [];
      
      if (token) {
        // Fetch auth users and roles via edge function
        const [usersResponse, rolesResponse] = await Promise.all([
          supabase.functions.invoke('admin-users', { body: { action: 'list' } }),
          supabase.functions.invoke('admin-users', { body: { action: 'listRoles' } })
        ]);

        if (usersResponse.error) {
          console.error('Error fetching auth users via edge function:', usersResponse.error);
        } else if (usersResponse.data?.users) {
          authUsers = usersResponse.data.users;
        }

        if (rolesResponse.error) {
          console.error('Error fetching roles via edge function:', rolesResponse.error);
        } else if (rolesResponse.data?.roles) {
          adminRoles = rolesResponse.data.roles;
        }
      }

      // Create set of admin user IDs for quick lookup
      const adminUserIds = new Set(adminRoles.map(r => r.user_id));

      // Merge profiles with emails and admin status
      const usersWithEmails = (profilesData || []).map(profile => {
        const authUser = authUsers.find((u: AuthUser) => u.id === profile.id);
        return {
          ...profile,
          email: authUser?.email || 'N/A',
          isAdmin: adminUserIds.has(profile.id)
        };
      });

      setUsers(usersWithEmails);

      // Fetch bookings for all users
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'active');

      if (bookingsError) throw bookingsError;

      // Group bookings by user_id
      const bookingsByUser: Record<string, UserBooking[]> = {};
      (bookingsData || []).forEach(booking => {
        if (!bookingsByUser[booking.user_id]) {
          bookingsByUser[booking.user_id] = [];
        }
        bookingsByUser[booking.user_id].push(booking);
      });

      setUserBookings(bookingsByUser);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: t('admin.users.error'),
        description: t('admin.users.errorFetch'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete', userId: deleteUserId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: t('admin.users.deleted'),
        description: t('admin.users.deletedDesc'),
      });

      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: t('admin.users.error'),
        description: error.message || t('admin.users.errorDelete'),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordUserId || !newPassword) return;

    if (newPassword.length < 6) {
      toast({
        title: t('admin.users.error'),
        description: t('admin.users.passwordMinError'),
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'changePassword', userId: passwordUserId, password: newPassword },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: t('admin.users.passwordChanged'),
        description: t('admin.users.passwordChangedDesc'),
      });

      setPasswordUserId(null);
      setNewPassword("");
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: t('admin.users.error'),
        description: error.message || t('admin.users.errorPassword'),
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCancelUserBooking = async (bookingId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: t('admin.users.cancelledBooking'),
        description: t('admin.users.cancelledBookingDesc'),
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast({
        title: t('admin.users.error'),
        description: error.message || t('admin.users.errorCancelBooking'),
        variant: "destructive",
      });
    }
  };

  const handleAdminAction = async () => {
    if (!adminActionUserId || !adminActionType) return;

    setIsChangingAdmin(true);

    try {
      const action = adminActionType === 'grant' ? 'grantAdmin' : 'revokeAdmin';
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: { action, userId: adminActionUserId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: adminActionType === 'grant' 
          ? t('admin.users.adminGranted') 
          : t('admin.users.adminRevoked'),
        description: adminActionType === 'grant'
          ? t('admin.users.adminGrantedDesc')
          : t('admin.users.adminRevokedDesc'),
      });

      setAdminActionUserId(null);
      setAdminActionType(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error changing admin status:', error);
      toast({
        title: t('admin.users.error'),
        description: error.message || t('admin.users.errorAdminAction'),
        variant: "destructive",
      });
    } finally {
      setIsChangingAdmin(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('admin.users.title')}</h2>
        <p className="text-muted-foreground">{t('admin.users.totalUsers')}: {users.length}</p>
      </div>

      <div className="space-y-4">
        {users.map((user) => {
          const bookings = userBookings[user.id] || [];
          
          return (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {user.full_name}
                      <Badge variant="outline">{bookings.length} {t('admin.users.bookingsCount')}</Badge>
                      {user.isAdmin && (
                        <Badge variant="default" className="bg-primary">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      <p>{t('admin.users.email')}: {user.email}</p>
                      {user.phone && <p>{t('admin.users.phone')}: {user.phone}</p>}
                      <p>{t('admin.users.registrationDate')}: {new Date(user.created_at).toLocaleDateString(i18n.language === 'pl' ? 'pl-PL' : 'en-US')}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.isAdmin ? (
                      user.id !== currentUser?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAdminActionUserId(user.id);
                            setAdminActionType('revoke');
                          }}
                        >
                          <ShieldOff className="h-4 w-4 mr-2" />
                          {t('admin.users.revokeAdmin')}
                        </Button>
                      )
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAdminActionUserId(user.id);
                          setAdminActionType('grant');
                        }}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        {t('admin.users.grantAdmin')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPasswordUserId(user.id)}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      {t('admin.users.changePassword')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteUserId(user.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('admin.users.delete')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {bookings.length > 0 && (
                <CardContent>
                  <h4 className="font-semibold mb-2">{t('admin.users.activeBookings')}:</h4>
                  <div className="space-y-2">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex justify-between items-center p-2 bg-secondary/30 rounded"
                      >
                        <span className="text-sm">
                          {t('admin.users.date')}: {new Date(booking.booking_date).toLocaleDateString(i18n.language === 'pl' ? 'pl-PL' : 'en-US')}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelUserBooking(booking.id, user.id)}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          {t('admin.users.unsubscribe')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Delete User Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.users.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.users.confirmDeleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('admin.users.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('admin.users.deleting')}
                </>
              ) : (
                t('admin.users.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Password Dialog */}
      <Dialog open={!!passwordUserId} onOpenChange={() => setPasswordUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.users.changePasswordTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.users.changePasswordDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">{t('admin.users.newPassword')}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('admin.users.passwordPlaceholder')}
                disabled={isChangingPassword}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordUserId(null)}>
              {t('admin.users.cancel')}
            </Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('admin.users.changing')}
                </>
              ) : (
                t('admin.users.changePassword')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Role Dialog */}
      <AlertDialog 
        open={!!adminActionUserId && !!adminActionType} 
        onOpenChange={() => {
          setAdminActionUserId(null);
          setAdminActionType(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {adminActionType === 'grant' 
                ? t('admin.users.confirmGrantAdmin') 
                : t('admin.users.confirmRevokeAdmin')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {adminActionType === 'grant'
                ? t('admin.users.confirmGrantAdminDesc')
                : t('admin.users.confirmRevokeAdminDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingAdmin}>
              {t('admin.users.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAdminAction} disabled={isChangingAdmin}>
              {isChangingAdmin ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('admin.users.changing')}
                </>
              ) : (
                adminActionType === 'grant' 
                  ? t('admin.users.grantAdmin') 
                  : t('admin.users.revokeAdmin')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersManager;
