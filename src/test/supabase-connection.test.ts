import { supabase } from '@/integrations/supabase/client';

/**
 * Comprehensive Supabase Connection Test
 * Tests database connectivity, authentication, and key tables
 */
export async function testSupabaseConnection() {
    const results = {
        connection: false,
        auth: false,
        tables: {} as Record<string, boolean>,
        migrations: {} as Record<string, boolean>,
        errors: [] as string[],
    };

    try {
        // Test 1: Basic Connection
        console.log('🔍 Testing Supabase connection...');
        const { data: connectionTest, error: connectionError } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);

        if (connectionError) {
            results.errors.push(`Connection Error: ${connectionError.message}`);
        } else {
            results.connection = true;
            console.log('✅ Connection successful');
        }

        // Test 2: Authentication Service
        console.log('🔍 Testing authentication service...');
        const { data: { session }, error: authError } = await supabase.auth.getSession();

        if (authError) {
            results.errors.push(`Auth Error: ${authError.message}`);
        } else {
            results.auth = true;
            console.log(`✅ Auth service available (Session: ${session ? 'Active' : 'None'})`);
        }

        // Test 3: Core Tables
        const tablesToTest = [
            'profiles',
            'plans',
            'plan_restrictions',
            'sessions',
            'conversations',
            'messages',
            'facilitators',
        ];

        console.log('🔍 Testing core tables...');
        for (const table of tablesToTest) {
            try {
                const { error } = await supabase
                    .from(table)
                    .select('*')
                    .limit(1);

                if (error) {
                    results.tables[table] = false;
                    results.errors.push(`Table ${table}: ${error.message}`);
                } else {
                    results.tables[table] = true;
                    console.log(`✅ Table '${table}' accessible`);
                }
            } catch (err) {
                results.tables[table] = false;
                results.errors.push(`Table ${table}: ${err}`);
            }
        }

        // Test 4: Check for new migration columns
        console.log('🔍 Testing migration columns...');

        // Check if 'banned' column exists in profiles
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('banned')
            .limit(1);

        results.migrations['profiles.banned'] = !profileError;
        if (profileError) {
            results.errors.push(`Migration check (profiles.banned): ${profileError.message}`);
        } else {
            console.log('✅ Migration column profiles.banned exists');
        }

        // Check if 'description' column exists in plans
        const { data: planData, error: planError } = await supabase
            .from('plans')
            .select('description')
            .limit(1);

        results.migrations['plans.description'] = !planError;
        if (planError) {
            results.errors.push(`Migration check (plans.description): ${planError.message}`);
        } else {
            console.log('✅ Migration column plans.description exists');
        }

        // Check if 'custom_branding' column exists in plan_restrictions
        const { data: restrictionData, error: restrictionError } = await supabase
            .from('plan_restrictions')
            .select('custom_branding, priority_support')
            .limit(1);

        results.migrations['plan_restrictions.custom_branding'] = !restrictionError;
        if (restrictionError) {
            results.errors.push(`Migration check (plan_restrictions): ${restrictionError.message}`);
        } else {
            console.log('✅ Migration columns plan_restrictions.custom_branding, priority_support exist');
        }

        // Test 5: Check if admin_profiles_view exists
        const { data: viewData, error: viewError } = await supabase
            .from('admin_profiles_view' as any)
            .select('*')
            .limit(1);

        results.migrations['admin_profiles_view'] = !viewError;
        if (viewError) {
            results.errors.push(`View check (admin_profiles_view): ${viewError.message}`);
        } else {
            console.log('✅ View admin_profiles_view exists');
        }

    } catch (error) {
        results.errors.push(`Unexpected error: ${error}`);
    }

    return results;
}

// Run the test if this file is executed directly
if (typeof window !== 'undefined') {
    testSupabaseConnection().then(results => {
        console.log('\n📊 Test Results:', results);

        const totalTables = Object.keys(results.tables).length;
        const successfulTables = Object.values(results.tables).filter(Boolean).length;
        const totalMigrations = Object.keys(results.migrations).length;
        const successfulMigrations = Object.values(results.migrations).filter(Boolean).length;

        console.log(`\n✅ Connection: ${results.connection ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Auth: ${results.auth ? 'PASS' : 'FAIL'}`);
        console.log(`✅ Tables: ${successfulTables}/${totalTables} accessible`);
        console.log(`✅ Migrations: ${successfulMigrations}/${totalMigrations} applied`);

        if (results.errors.length > 0) {
            console.log('\n❌ Errors:');
            results.errors.forEach(err => console.log(`  - ${err}`));
        }
    });
}
