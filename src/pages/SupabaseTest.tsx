import { useEffect, useState } from 'react';
import { testSupabaseConnection } from '@/test/supabase-connection.test';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

export default function SupabaseTest() {
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const runTest = async () => {
        setLoading(true);
        try {
            const testResults = await testSupabaseConnection();
            setResults(testResults);
        } catch (error) {
            console.error('Test failed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runTest();
    }, []);

    if (loading && !results) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600">Testing Supabase connection...</p>
                </div>
            </div>
        );
    }

    const totalTables = results ? Object.keys(results.tables).length : 0;
    const successfulTables = results ? Object.values(results.tables).filter(Boolean).length : 0;
    const totalMigrations = results ? Object.keys(results.migrations).length : 0;
    const successfulMigrations = results ? Object.values(results.migrations).filter(Boolean).length : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            Supabase Connection Test
                        </h1>
                        <p className="text-gray-600 mt-2">Verify database connectivity and schema</p>
                    </div>
                    <Button onClick={runTest} disabled={loading}>
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Retest
                    </Button>
                </div>

                {results && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-600">Connection</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2">
                                        {results.connection ? (
                                            <CheckCircle className="h-8 w-8 text-green-600" />
                                        ) : (
                                            <XCircle className="h-8 w-8 text-red-600" />
                                        )}
                                        <span className="text-2xl font-bold">
                                            {results.connection ? 'PASS' : 'FAIL'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-600">Auth Service</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2">
                                        {results.auth ? (
                                            <CheckCircle className="h-8 w-8 text-green-600" />
                                        ) : (
                                            <XCircle className="h-8 w-8 text-red-600" />
                                        )}
                                        <span className="text-2xl font-bold">
                                            {results.auth ? 'PASS' : 'FAIL'}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-600">Tables</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2">
                                        {successfulTables === totalTables ? (
                                            <CheckCircle className="h-8 w-8 text-green-600" />
                                        ) : (
                                            <XCircle className="h-8 w-8 text-yellow-600" />
                                        )}
                                        <span className="text-2xl font-bold">
                                            {successfulTables}/{totalTables}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium text-gray-600">Migrations</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2">
                                        {successfulMigrations === totalMigrations ? (
                                            <CheckCircle className="h-8 w-8 text-green-600" />
                                        ) : (
                                            <XCircle className="h-8 w-8 text-yellow-600" />
                                        )}
                                        <span className="text-2xl font-bold">
                                            {successfulMigrations}/{totalMigrations}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Tables Detail */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Database Tables</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {Object.entries(results.tables).map(([table, success]) => (
                                        <div key={table} className="flex items-center gap-2 p-2 border rounded">
                                            {success ? (
                                                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                            )}
                                            <span className="text-sm font-mono">{table}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Migrations Detail */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Migration Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {Object.entries(results.migrations).map(([migration, success]) => (
                                        <div key={migration} className="flex items-center gap-2 p-2 border rounded">
                                            {success ? (
                                                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                            )}
                                            <span className="text-sm font-mono">{migration}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Errors */}
                        {results.errors.length > 0 && (
                            <Card className="border-red-200">
                                <CardHeader>
                                    <CardTitle className="text-red-600">Errors & Warnings</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {results.errors.map((error: string, index: number) => (
                                            <div key={index} className="p-3 bg-red-50 border border-red-200 rounded text-sm font-mono text-red-800">
                                                {error}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
