/**
 * Referrals
 *
 * Page for the AIfacilitator application.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Gift, Mail, Share2, Check, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedButton } from "@/components/ui/animated-button";
import { pageVariants, staggerContainer, staggerItem } from "@/lib/animations";
import PageHead from "@/components/PageHead";

const Referrals = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [emailToInvite, setEmailToInvite] = useState("");
    const [copied, setCopied] = useState(false);

    const referralLink = `${window.location.origin}/signup?ref=${user?.id}`;

    // Fetch referrals
    const { data: referrals, isLoading } = useQuery({
        queryKey: ["referrals"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("referrals")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.warn('Referrals query error:', error);
                return [];
            }
            return data ?? [];
        },
        retry: false,
    });

    // Invite mutation
    const inviteMutation = useMutation({
        mutationFn: async (email: string) => {
            const { error } = await supabase.from("referrals").insert({
                referrer_id: user?.id,
                referred_email: email,
                status: "pending",
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast({
                title: "Invitation sent!",
                description: `We've sent an invite to ${emailToInvite}`,
            });
            setEmailToInvite("");
            queryClient.invalidateQueries({ queryKey: ["referrals"] });
        },
        onError: (error) => {
            toast({
                title: "Error sending invite",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
            title: "Copied!",
            description: "Referral link copied to clipboard",
        });
    };

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!emailToInvite) return;
        inviteMutation.mutate(emailToInvite);
    };

    const stats = [
        {
            label: "Total Referrals",
            value: referrals?.length || 0,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-100",
        },
        {
            label: "Pending",
            value: referrals?.filter((r) => r.status === "pending").length || 0,
            icon: Mail,
            color: "text-yellow-600",
            bg: "bg-yellow-100",
        },
        {
            label: "Earned Months",
            value: referrals?.filter((r) => r.status === "rewarded").length || 0,
            icon: Gift,
            color: "text-green-600",
            bg: "bg-green-100",
        },
    ];

    return (
        <motion.div
            className="container mx-auto px-4 pt-24 pb-8 max-w-5xl"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <PageHead title="Referrals" description="Invite friends and earn free months" />
            <div className="text-center mb-12 space-y-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-block p-4 rounded-full bg-purple-100 mb-4"
                >
                    <Gift className="h-12 w-12 text-purple-600" />
                </motion.div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Invite Friends, Get Free Months
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Give your friends a free month of Pro, and get a free month for yourself when they subscribe.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
                {/* Invite Section */}
                <Card className="border-purple-100 shadow-lg">
                    <CardHeader>
                        <CardTitle>Share your link</CardTitle>
                        <CardDescription>
                            Copy your unique link and share it with your network
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex gap-2">
                            <Input value={referralLink} readOnly className="bg-gray-50" />
                            <AnimatedButton onClick={handleCopy} variant="outline" className="gap-2">
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Copied" : "Copy"}
                            </AnimatedButton>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-muted-foreground">Or invite by email</span>
                            </div>
                        </div>

                        <form onSubmit={handleInvite} className="flex gap-2">
                            <Input
                                placeholder="friend@example.com"
                                value={emailToInvite}
                                onChange={(e) => setEmailToInvite(e.target.value)}
                                type="email"
                            />
                            <AnimatedButton
                                type="submit"
                                disabled={inviteMutation.isPending}
                                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                            >
                                <Mail className="h-4 w-4" />
                                Invite
                            </AnimatedButton>
                        </form>
                    </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-4">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card>
                                <CardContent className="flex items-center p-6">
                                    <div className={`p-4 rounded-full ${stat.bg} mr-4`}>
                                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                                        <h3 className="text-2xl font-bold">{stat.value}</h3>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Referrals List */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Referrals</CardTitle>
                    <CardDescription>Track the status of your invites</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                    ) : referrals?.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Share2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No referrals yet. Start sharing!</p>
                        </div>
                    ) : (
                        <motion.div
                            variants={staggerContainer}
                            initial="initial"
                            animate="animate"
                            className="space-y-4"
                        >
                            {referrals?.map((referral) => (
                                <motion.div
                                    key={referral.id}
                                    variants={staggerItem}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                                            {referral.referred_email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium">{referral.referred_email}</p>
                                            <p className="text-sm text-gray-500">
                                                Invited on {new Date(referral.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-sm font-medium capitalize
                    ${referral.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            referral.status === 'rewarded' ? 'bg-purple-100 text-purple-700' :
                                                'bg-yellow-100 text-yellow-700'}`}
                                    >
                                        {referral.status}
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default Referrals;
