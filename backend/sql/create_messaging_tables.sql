-- =====================================================
-- Messaging System Tables
-- In-app messaging between guests and staff
-- =====================================================

-- Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('guest_staff', 'staff_staff', 'guest_guest')),
    subject VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation Participants Table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('owner', 'participant', 'staff')),
    last_read_at TIMESTAMP WITH TIME ZONE,
    is_muted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'automated')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Attachments Table (Optional - for future use)
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_last_read ON public.conversation_participants(last_read_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);

CREATE INDEX IF NOT EXISTS idx_attachments_message ON public.message_attachments(message_id);

-- =====================================================
-- Triggers
-- =====================================================

-- Update last_message_at in conversations when a new message is added
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.conversations
    SET
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_conversation_last_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Conversations Policies
CREATE POLICY "Users can view own conversations"
    ON public.conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_participants.conversation_id = conversations.id
            AND conversation_participants.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Staff can view all conversations"
    ON public.conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Participants can update own conversations"
    ON public.conversations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_participants.conversation_id = conversations.id
            AND conversation_participants.user_id = (select auth.uid())
        )
    );

-- Conversation Participants Policies
CREATE POLICY "Users can view own participation"
    ON public.conversation_participants FOR SELECT
    USING (user_id = (select auth.uid()));

CREATE POLICY "Staff can view all participants"
    ON public.conversation_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Users can join conversations"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own participation"
    ON public.conversation_participants FOR UPDATE
    USING (user_id = (select auth.uid()));

-- Messages Policies
CREATE POLICY "Users can view messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_participants.conversation_id = messages.conversation_id
            AND conversation_participants.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Staff can view all messages"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = (select auth.uid())
            AND raw_user_meta_data->>'role' IN ('admin', 'manager', 'staff')
        )
    );

CREATE POLICY "Users can send messages to their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        sender_id = (select auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_participants.conversation_id = messages.conversation_id
            AND conversation_participants.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can update own messages"
    ON public.messages FOR UPDATE
    USING (sender_id = (select auth.uid()));

-- Message Attachments Policies
CREATE POLICY "Users can view attachments in their conversations"
    ON public.message_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.messages
            JOIN public.conversation_participants ON conversation_participants.conversation_id = messages.conversation_id
            WHERE messages.id = message_attachments.message_id
            AND conversation_participants.user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can add attachments to own messages"
    ON public.message_attachments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.messages
            WHERE messages.id = message_attachments.message_id
            AND messages.sender_id = (select auth.uid())
        )
    );

-- =====================================================
-- Service Role Policies (Full Access)
-- =====================================================

CREATE POLICY "Service role full access to conversations"
    ON public.conversations FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to participants"
    ON public.conversation_participants FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to messages"
    ON public.messages FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to attachments"
    ON public.message_attachments FOR ALL
    USING ((select auth.jwt()) ->> 'role' = 'service_role');

-- =====================================================
-- Helper Functions
-- =====================================================

-- Get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE cp.user_id = p_user_id
    AND m.sender_id != p_user_id
    AND m.is_read = false
    AND m.is_deleted = false;

    RETURN v_count;
END;
$$;

-- Mark all messages in a conversation as read for a user
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.messages
    SET
        is_read = true,
        read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND is_read = false;

    UPDATE public.conversation_participants
    SET last_read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$;

-- =====================================================
-- Success Message
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Messaging system tables created successfully!';
    RAISE NOTICE 'Tables: 4 (conversations, conversation_participants, messages, message_attachments)';
    RAISE NOTICE 'Indexes: 9';
    RAISE NOTICE 'Triggers: 3';
    RAISE NOTICE 'RLS Policies: 20+';
    RAISE NOTICE 'Helper Functions: 2';
END $$;
