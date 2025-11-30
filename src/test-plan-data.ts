// Temporary file to test plan_restrictions structure
import { supabase } from './integrations/supabase/client';

async function testPlanRestrictions() {
    const { data, error } = await supabase
        .from('plans')
        .select('*, plan_restrictions(*)')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample plan data:', JSON.stringify(data, null, 2));
    }
}

// Run this in browser console: testPlanRestrictions()
export { testPlanRestrictions };
