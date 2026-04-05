-- Fix chat_messages.role column from enum to varchar
DO $$
BEGIN
    -- Check if the column is still using the enum type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'role'
        AND data_type = 'USER-DEFINED'
    ) THEN
        -- Alter the column to varchar
        ALTER TABLE chat_messages ALTER COLUMN role TYPE VARCHAR(20);
        
        -- Drop the old enum type if it exists
        DROP TYPE IF EXISTS message_role;
        DROP TYPE IF EXISTS messagerole;
    END IF;
END $$;
