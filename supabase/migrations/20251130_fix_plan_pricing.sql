-- Fix Plan Pricing in Database
-- Date: 2025-11-30
-- Purpose: Correct plan prices to realistic values (stored in cents)

-- Update plan prices to realistic values
-- Prices are stored in cents (e.g., 2900 = €29.00)

UPDATE plans
SET price = 0
WHERE title = 'Free';

UPDATE plans
SET price = 2900  -- €29/month
WHERE title = 'Starter';

UPDATE plans
SET price = 4900  -- €49/month
WHERE title = 'Pro' OR title = 'Premium';

UPDATE plans
SET price = 9900  -- €99/month
WHERE title = 'Enterprise';

-- Verify the changes
SELECT 
  id,
  title,
  price,
  CASE 
    WHEN price = 0 THEN 'Free'
    ELSE CONCAT('€', CAST(price / 100.0 AS DECIMAL(10,2)), '/month')
  END as formatted_price,
  currency,
  plan_type,
  stripe_plan_id
FROM plans
ORDER BY price ASC;

-- Optional: If you want different prices, use these templates:
-- €19/month → price = 1900
-- €29/month → price = 2900
-- €39/month → price = 3900
-- €49/month → price = 4900
-- €79/month → price = 7900
-- €99/month → price = 9900
-- €149/month → price = 14900
-- €199/month → price = 19900
