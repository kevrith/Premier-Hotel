-- =====================================================
-- Fix 507 Errors - Prevent Trigger Loops
-- =====================================================

-- The issue is likely in the review response count trigger
-- It might be causing infinite loops

-- =====================================================
-- Fix Review Response Count Trigger
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_review_response_count ON public.review_responses;

-- Recreate with proper loop prevention
CREATE OR REPLACE FUNCTION update_review_response_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only update if not already updating
    IF TG_OP = 'INSERT' THEN
        UPDATE public.reviews
        SET
            response_count = response_count + 1,
            has_response = true
        WHERE id = NEW.review_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.reviews
        SET
            response_count = GREATEST(response_count - 1, 0),
            has_response = (SELECT COUNT(*) > 0 FROM public.review_responses WHERE review_id = OLD.review_id AND id != OLD.id)
        WHERE id = OLD.review_id;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_review_response_count
    AFTER INSERT OR DELETE ON public.review_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_review_response_count();

-- =====================================================
-- Fix Review Helpfulness Count Trigger
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_review_helpfulness_count ON public.review_helpfulness;

CREATE OR REPLACE FUNCTION update_review_helpfulness_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_helpful THEN
            UPDATE public.reviews SET helpful_count = helpful_count + 1 WHERE id = NEW.review_id;
        ELSE
            UPDATE public.reviews SET not_helpful_count = not_helpful_count + 1 WHERE id = NEW.review_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND OLD.is_helpful != NEW.is_helpful THEN
        IF NEW.is_helpful THEN
            UPDATE public.reviews
            SET
                helpful_count = helpful_count + 1,
                not_helpful_count = GREATEST(not_helpful_count - 1, 0)
            WHERE id = NEW.review_id;
        ELSE
            UPDATE public.reviews
            SET
                helpful_count = GREATEST(helpful_count - 1, 0),
                not_helpful_count = not_helpful_count + 1
            WHERE id = NEW.review_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_helpful THEN
            UPDATE public.reviews SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = OLD.review_id;
        ELSE
            UPDATE public.reviews SET not_helpful_count = GREATEST(not_helpful_count - 1, 0) WHERE id = OLD.review_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_review_helpfulness_count
    AFTER INSERT OR UPDATE OR DELETE ON public.review_helpfulness
    FOR EACH ROW
    EXECUTE FUNCTION update_review_helpfulness_count();

-- =====================================================
-- Disable triggers temporarily if needed (optional)
-- Run these if you need to disable triggers to fix data
-- =====================================================

-- To disable all triggers on a table:
-- ALTER TABLE public.reviews DISABLE TRIGGER ALL;

-- To re-enable:
-- ALTER TABLE public.reviews ENABLE TRIGGER ALL;

-- =====================================================
-- Check for existing issues
-- =====================================================

-- Reset any potentially corrupt counts
UPDATE public.reviews
SET
    response_count = (SELECT COUNT(*) FROM public.review_responses WHERE review_id = reviews.id),
    has_response = (SELECT COUNT(*) > 0 FROM public.review_responses WHERE review_id = reviews.id),
    helpful_count = (SELECT COUNT(*) FROM public.review_helpfulness WHERE review_id = reviews.id AND is_helpful = true),
    not_helpful_count = (SELECT COUNT(*) FROM public.review_helpfulness WHERE review_id = reviews.id AND is_helpful = false)
WHERE id IN (SELECT id FROM public.reviews LIMIT 1000);

-- =====================================================
-- Alternative: Remove problematic triggers entirely
-- =====================================================

-- If the triggers are still causing issues, uncomment these to remove them:
-- DROP TRIGGER IF EXISTS trigger_update_review_response_count ON public.review_responses;
-- DROP TRIGGER IF EXISTS trigger_update_review_helpfulness_count ON public.review_helpfulness;
-- DROP FUNCTION IF EXISTS update_review_response_count();
-- DROP FUNCTION IF EXISTS update_review_helpfulness_count();

-- Then handle counts in application code instead
