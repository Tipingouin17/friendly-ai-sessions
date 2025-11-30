import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

const FacilitatorDebug = () => {
    const { data: facilitators, isLoading, error } = useQuery({
        queryKey: ['facilitators-debug'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('facilitators')
                .select('*')
                .order('order', { ascending: true });

            if (error) throw error;
            return data;
        }
    });

    if (isLoading) return <div className="p-8">Loading...</div>;
    if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <h1 className="text-2xl font-bold mb-6">Facilitator Data Debug</h1>

            <div className="space-y-4">
                {facilitators?.map((facilitator) => (
                    <Card key={facilitator.id} className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="font-semibold mb-2">ID: {facilitator.id}</h3>
                                <p className="text-sm"><strong>Title:</strong> {facilitator.title}</p>
                                <p className="text-sm"><strong>Order:</strong> {facilitator.order}</p>
                                <p className="text-sm break-all">
                                    <strong>Profile Picture:</strong>
                                    <br />
                                    <code className="bg-gray-100 p-1 rounded">
                                        {facilitator.profile_picture || '(null)'}
                                    </code>
                                </p>
                                <p className="text-sm"><strong>Type:</strong> {typeof facilitator.profile_picture}</p>
                            </div>
                            <div>
                                <p className="text-sm font-semibold mb-2">Image Preview:</p>
                                {facilitator.profile_picture ? (
                                    <div className="space-y-2">
                                        <img
                                            src={`https://msahrdujupfcotujyluy.supabase.co/storage/v1/object/public/facilitator-avatars/${facilitator.profile_picture}`}
                                            alt={facilitator.title}
                                            className="w-32 h-32 object-cover rounded-full border-2 border-gray-300"
                                            onError={(e) => {
                                                console.error('Image failed to load:', facilitator.profile_picture);
                                                e.currentTarget.src = '/placeholder.svg';
                                            }}
                                        />
                                        <p className="text-xs text-gray-500 break-all">
                                            <strong>URL:</strong> {`https://msahrdujupfcotujyluy.supabase.co/storage/v1/object/public/facilitator-avatars/${facilitator.profile_picture}`}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Is filename only: {!facilitator.profile_picture.includes('/') && !facilitator.profile_picture.startsWith('http') ? '✅ Yes' : '❌ No'}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">No image URL</p>
                                )}
                            </div>
                        </div>

                        <details className="mt-4">
                            <summary className="cursor-pointer text-sm font-semibold">Full Data (JSON)</summary>
                            <pre className="mt-2 bg-gray-100 p-4 rounded text-xs overflow-auto">
                                {JSON.stringify(facilitator, null, 2)}
                            </pre>
                        </details>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default FacilitatorDebug;
