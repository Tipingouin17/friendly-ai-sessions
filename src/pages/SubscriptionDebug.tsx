import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const SubscriptionDebug = () => {
    const { user } = useAuth();

    const { data: profileData } = useQuery({
        queryKey: ['profile-debug', user?.id],
        queryFn: async () => {
            if (!user) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('current_plan_id, subscription_status, stripe_customer_id, stripe_subscription_id')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    const { data: planData } = useQuery({
        queryKey: ['plan-debug', profileData?.current_plan_id],
        queryFn: async () => {
            if (!profileData?.current_plan_id) return null;
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .eq('id', profileData.current_plan_id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!profileData?.current_plan_id,
    });

    const { data: restrictionsData } = useQuery({
        queryKey: ['restrictions-debug', profileData?.current_plan_id],
        queryFn: async () => {
            if (!profileData?.current_plan_id) return null;
            const { data, error } = await supabase
                .from('plan_restrictions')
                .select('*')
                .eq('plan_id', profileData.current_plan_id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!profileData?.current_plan_id,
    });

    const { data: facilitatorCount } = useQuery({
        queryKey: ['facilitator-count', user?.id],
        queryFn: async () => {
            if (!user) return 0;
            const { count, error } = await supabase
                .from('facilitators')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            if (error) throw error;
            return count || 0;
        },
        enabled: !!user,
    });

    const { data: sessionCount } = useQuery({
        queryKey: ['session-count', user?.id],
        queryFn: async () => {
            if (!user) return 0;
            const { count, error } = await supabase
                .from('sessions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            if (error) throw error;
            return count || 0;
        },
        enabled: !!user,
    });

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <h1 className="text-2xl font-bold mb-6">Subscription Debug Information</h1>

            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Profile Data</h2>
                    <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                        {JSON.stringify(profileData, null, 2)}
                    </pre>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Plan Data</h2>
                    <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                        {JSON.stringify(planData, null, 2)}
                    </pre>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Plan Restrictions</h2>
                    <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                        {JSON.stringify(restrictionsData, null, 2)}
                    </pre>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Usage Counts</h2>
                    <div className="space-y-2">
                        <p><strong>Facilitators Created:</strong> {facilitatorCount}</p>
                        <p><strong>Sessions Created:</strong> {sessionCount}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionDebug;
