import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Check, Crown, Star, Zap, Users, Building2, CreditCard, ExternalLink, UserPlus, Trash2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  is_account_owner: boolean;
  last_login: string;
  created_at: string;
}

const tierIcons = { starter: Zap, professional: Star, enterprise: Crown };
const tierColors = { starter: 'bg-blue-500', professional: 'bg-purple-500', enterprise: 'bg-amber-500' };

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price_monthly: 49,
    price_annual: 39,
    properties: '10',
    users: '2',
    features: ['Property management', 'Tenant tracking', 'Maintenance requests', 'Payment processing', 'Document storage', 'Basic reports'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price_monthly: 99,
    price_annual: 79,
    properties: '50',
    users: '10',
    features: ['Everything in Starter', 'API access', 'Priority support', 'Advanced analytics', 'Custom reports', 'Bulk operations'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price_monthly: 299,
    price_annual: 239,
    properties: 'Unlimited',
    users: 'Unlimited',
    features: ['Everything in Professional', 'White-label branding', 'Custom domain', 'Dedicated support', 'SLA guarantee', 'Custom integrations'],
  },
];

export default function Settings() {
  const { user, account, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', full_name: '', role: 'manager' });
  const [profileData, setProfileData] = useState({ full_name: '', email: '' });
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '' });

  useEffect(() => {
    if (user) {
      setProfileData({ full_name: user.full_name, email: user.email });
    }
    loadTeam();
  }, [user]);

  const loadTeam = async () => {
    try {
      const data = await api.getTeam();
      setTeam(data);
    } catch {}
  };

  const handleSubscribe = async (tier: string) => {
    try {
      const result = await api.createSubscriptionCheckout({ tier, billing_period: billingPeriod });
      if (result.url) window.location.href = result.url;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleManageBilling = async () => {
    try {
      const result = await api.openBillingPortal();
      if (result.url) window.location.href = result.url;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleInvite = async () => {
    try {
      await api.inviteTeamMember(inviteData);
      toast({ title: 'Invitation sent', description: `${inviteData.email} has been invited.` });
      setInviteOpen(false);
      setInviteData({ email: '', full_name: '', role: 'manager' });
      loadTeam();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.removeTeamMember(userId);
      toast({ title: 'Member removed' });
      loadTeam();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateProfile(profileData);
      toast({ title: 'Profile updated' });
      refreshProfile();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateProfile(passwordData);
      toast({ title: 'Password changed successfully' });
      setPasswordData({ current_password: '', new_password: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = () => {
    if (!account) return null;
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default', trial: 'secondary', past_due: 'destructive', canceled: 'destructive'
    };
    return <Badge variant={variants[account.subscription_status] || 'outline'}>{account.subscription_status}</Badge>;
  };

  const trialDaysLeft = account?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(account.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account, subscription, and team</p>
      </div>

      <Tabs defaultValue="subscription" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* SUBSCRIPTION TAB */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current Plan Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Current Plan {getStatusBadge()}
                  </CardTitle>
                  <CardDescription>
                    {account?.subscription_status === 'trial'
                      ? `Free trial - ${trialDaysLeft} days remaining`
                      : `${account?.subscription_tier?.charAt(0).toUpperCase()}${account?.subscription_tier?.slice(1)} plan`}
                  </CardDescription>
                </div>
                {account?.subscription_status === 'active' && (
                  <Button variant="outline" onClick={handleManageBilling}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Billing
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Building2 className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-2xl font-bold">{account?.current_property_count || 0}</p>
                  <p className="text-xs text-muted-foreground">of {account?.property_limit === -1 ? '∞' : account?.property_limit} properties</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-2xl font-bold">{team.length}</p>
                  <p className="text-xs text-muted-foreground">team members</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <Shield className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium capitalize">{account?.subscription_tier}</p>
                  <p className="text-xs text-muted-foreground">current tier</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <CreditCard className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium capitalize">{account?.subscription_status}</p>
                  <p className="text-xs text-muted-foreground">billing status</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Plans */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Choose a Plan</h2>
              <div className="flex items-center gap-2 rounded-lg border p-1">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${billingPeriod === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('annual')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${billingPeriod === 'annual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                >
                  Annual <span className="text-green-500 text-xs font-medium ml-1">Save 20%</span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const Icon = tierIcons[plan.id as keyof typeof tierIcons] || Zap;
                const bgColor = tierColors[plan.id as keyof typeof tierColors] || 'bg-blue-500';
                const isCurrentPlan = account?.subscription_tier === plan.id;
                const price = billingPeriod === 'annual' ? plan.price_annual : plan.price_monthly;

                return (
                  <Card key={plan.id} className={`relative ${plan.popular ? 'border-primary shadow-md' : ''}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="gradient-primary border-0">Most Popular</Badge>
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div className={`${bgColor} p-2 rounded-lg`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                      </div>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">${price}</span>
                        <span className="text-muted-foreground text-sm">/month</span>
                        {billingPeriod === 'annual' && (
                          <p className="text-xs text-green-600 mt-1">Billed annually (${price * 12}/year)</p>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-4 text-sm">
                        <div><span className="font-medium">{plan.properties}</span> <span className="text-muted-foreground">properties</span></div>
                        <div><span className="font-medium">{plan.users}</span> <span className="text-muted-foreground">users</span></div>
                      </div>
                      <ul className="space-y-2">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4 text-green-500 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full ${isCurrentPlan ? '' : plan.popular ? 'gradient-primary' : ''}`}
                        variant={isCurrentPlan ? 'outline' : plan.popular ? 'default' : 'outline'}
                        disabled={isCurrentPlan}
                        onClick={() => handleSubscribe(plan.id)}
                      >
                        {isCurrentPlan ? 'Current Plan' : 'Subscribe'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* TEAM TAB */}
        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>{team.length} members in your organization</CardDescription>
                </div>
                {user?.role === 'admin' && (
                  <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                    <DialogTrigger asChild>
                      <Button><UserPlus className="mr-2 h-4 w-4" />Invite Member</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                        <DialogDescription>Add a new member to your organization</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            placeholder="member@company.com"
                            value={inviteData.email}
                            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                          <Input
                            placeholder="John Smith"
                            value={inviteData.full_name}
                            onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={inviteData.role} onValueChange={(v) => setInviteData({ ...inviteData, role: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin - Full access</SelectItem>
                              <SelectItem value="manager">Manager - Can edit data</SelectItem>
                              <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleInvite} className="w-full">Send Invitation</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {team.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">{member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.full_name || member.email}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>{member.role}</Badge>
                      {member.is_account_owner && <Badge variant="outline">Owner</Badge>}
                      {user?.role === 'admin' && !member.is_account_owner && member.user_id !== user?.user_id && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.user_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={profileData.full_name} onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} />
                  </div>
                </div>
                <Button type="submit">Save Changes</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input type="password" value={passwordData.current_password} onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" value={passwordData.new_password} onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })} minLength={8} />
                  </div>
                </div>
                <Button type="submit" variant="outline">Change Password</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
