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
import api from "@/lib/api";
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
    const { data: referrals, isLoading, isError } = useQuery({
        queryKey: ["referrals", user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await api
                .from("referrals")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.warn('Referrals query error:', error);
                // Return empty array so the page renders instead of hanging
                return [];
            }
            return data ?? [];
        },
        enabled: !!user?.id,
        retry: 1,
        staleTime: 60_000, // 1 minute
    });

    // Invite mutation
    const inviteMutation = useMutation({
        mutationFn: async (email: string) => {
            const { error } = await api.from("referrals").insert({
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

    const shareText = encodeURIComponent("Join me on AIfacilitator — the AI-powered workshop facilitation platform. Get a free month when you sign up!");
    const shareUrl = encodeURIComponent(referralLink);

    const socialLinks = [
        {
            name: "Twitter / X",
            color: "bg-black hover:bg-gray-800 text-white",
            icon: (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            ),
            href: `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`,
        },
        {
            name: "LinkedIn",
            color: "bg-[#0A66C2] hover:bg-[#004182] text-white",
            icon: (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
            ),
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
        },
        {
            name: "WhatsApp",
            color: "bg-[#25D366] hover:bg-[#128C7E] text-white",
            icon: (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            ),
            href: `https://wa.me/?text=${shareText}%20${shareUrl}`,
        },
    ];

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
                <h1 className="text-4xl font-bold text-gray-900">
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

                        {/* Social sharing buttons */}
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Share on social</p>
                            <div className="flex gap-2 flex-wrap">
                                {socialLinks.map((s) => (
                                    <Button
                                        key={s.name}
                                        asChild
                                        size="sm"
                                        className={`gap-2 rounded-full text-xs px-4 ${s.color}`}
                                    >
                                        <a href={s.href} target="_blank" rel="noopener noreferrer">
                                            {s.icon}
                                            {s.name}
                                        </a>
                                    </Button>
                                ))}
                            </div>
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
                        <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
                            <span className="w-4 h-4 border-t-2 border-gray-400 border-solid rounded-full animate-spin"></span>
                            Loading your referrals...
                        </div>
                    ) : isError ? (
                        <div className="text-center py-8 text-gray-400">
                            <Share2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">Could not load referrals. Please refresh the page.</p>
                        </div>
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
