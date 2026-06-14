-- Migration 011: Analytics overview RPC function
-- Pre-aggregates customer_stats for a restaurant in a single server-side call
-- Eliminates the need for 40+ paginated API requests from the client

CREATE OR REPLACE FUNCTION get_analytics_overview(p_restaurant_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_customers BIGINT;
  v_with_phone BIGINT;
  v_with_email BIGINT;
  v_with_both BIGINT;
  v_result JSON;
BEGIN
  -- Total customers
  SELECT COUNT(*) INTO v_total_customers
  FROM customers WHERE restaurant_id = p_restaurant_id;

  -- Contact distribution
  SELECT COUNT(*) INTO v_with_phone
  FROM customers WHERE restaurant_id = p_restaurant_id AND phone IS NOT NULL AND phone != '';

  SELECT COUNT(*) INTO v_with_email
  FROM customers WHERE restaurant_id = p_restaurant_id AND email IS NOT NULL AND email != '';

  SELECT COUNT(*) INTO v_with_both
  FROM customers WHERE restaurant_id = p_restaurant_id AND phone IS NOT NULL AND phone != '' AND email IS NOT NULL AND email != '';

  -- Aggregate stats via JOIN (single query, no pagination needed)
  SELECT json_build_object(
    'totalCustomers', v_total_customers,
    'withPhone', v_with_phone,
    'withEmail', v_with_email,
    'withBoth', v_with_both,
    'withNeither', GREATEST(0, v_total_customers - v_with_phone - v_with_email + v_with_both),
    'stats', (
      SELECT json_build_object(
        'totalVisits', COALESCE(SUM(cs.total_visits), 0),
        'totalNoShows', COALESCE(SUM(cs.no_show_count), 0),
        'totalSpent', COALESCE(SUM(cs.total_spent), 0),
        'recurring', COUNT(*) FILTER (WHERE cs.is_recurring = true),
        'segments', (
          SELECT json_object_agg(tier, cnt) FROM (
            SELECT COALESCE(cs.loyalty_tier, 'none') AS tier, COUNT(*) AS cnt
            FROM customer_stats cs
            JOIN customers c ON c.id = cs.customer_id
            WHERE c.restaurant_id = p_restaurant_id
            GROUP BY cs.loyalty_tier
          ) seg
        ),
        'retention', json_build_object(
          'oneTime', COUNT(*) FILTER (WHERE cs.total_visits <= 1),
          'twoToThree', COUNT(*) FILTER (WHERE cs.total_visits BETWEEN 2 AND 3),
          'fourToFive', COUNT(*) FILTER (WHERE cs.total_visits BETWEEN 4 AND 5),
          'sixToTen', COUNT(*) FILTER (WHERE cs.total_visits BETWEEN 6 AND 10),
          'vip', COUNT(*) FILTER (WHERE cs.total_visits >= 11)
        ),
        'noShowRisk', json_build_object(
          'noRisk', COUNT(*) FILTER (WHERE cs.no_show_count = 0),
          'lowRisk', COUNT(*) FILTER (WHERE cs.no_show_count = 1),
          'medRisk', COUNT(*) FILTER (WHERE cs.no_show_count BETWEEN 2 AND 3),
          'highRisk', COUNT(*) FILTER (WHERE cs.no_show_count >= 4)
        ),
        'recent30', COUNT(*) FILTER (WHERE cs.last_visit_date >= CURRENT_DATE - INTERVAL '30 days'),
        'recent90', COUNT(*) FILTER (WHERE cs.last_visit_date >= CURRENT_DATE - INTERVAL '90 days'),
        'highRiskClients', (
          SELECT json_agg(risk_data) FROM (
            SELECT cs.customer_id, cs.no_show_count, cs.total_visits, cs.loyalty_tier
            FROM customer_stats cs
            JOIN customers c ON c.id = cs.customer_id
            WHERE c.restaurant_id = p_restaurant_id AND cs.no_show_count >= 2
            ORDER BY cs.no_show_count DESC LIMIT 20
          ) risk_data
        ),
        'vipClients', (
          SELECT json_agg(vip_data) FROM (
            SELECT cs.customer_id, cs.total_visits, cs.no_show_count, cs.loyalty_tier
            FROM customer_stats cs
            JOIN customers c ON c.id = cs.customer_id
            WHERE c.restaurant_id = p_restaurant_id
            ORDER BY cs.total_visits DESC LIMIT 20
          ) vip_data
        ),
        'reactivation', (
          SELECT json_build_object(
            'dormantClients', COUNT(*) FILTER (WHERE cs.total_visits <= 1),
            'reachableWhatsApp', 0,
            'reachableEmail', 0,
            'notReachable', 0
          )
          FROM customer_stats cs
          JOIN customers c ON c.id = cs.customer_id
          WHERE c.restaurant_id = p_restaurant_id
        )
      )
      FROM customer_stats cs
      JOIN customers c ON c.id = cs.customer_id
      WHERE c.restaurant_id = p_restaurant_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Reactivation contact data RPC (separate because it needs customers table)
CREATE OR REPLACE FUNCTION get_reactivation_contacts(p_restaurant_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'dormantClients', COUNT(*),
    'reachableWhatsApp', COUNT(*) FILTER (WHERE c.phone IS NOT NULL AND c.phone != ''),
    'reachableEmail', COUNT(*) FILTER (WHERE c.email IS NOT NULL AND c.email != ''),
    'notReachable', COUNT(*) FILTER (WHERE (c.phone IS NULL OR c.phone = '') AND (c.email IS NULL OR c.email = ''))
  ) INTO v_result
  FROM customers c
  JOIN customer_stats cs ON cs.customer_id = c.id
  WHERE c.restaurant_id = p_restaurant_id
    AND cs.total_visits <= 1;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;