-- Fix documents.status column from enum to varchar
DO $$
BEGIN
    -- Check if the column is still using the enum type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name = 'status'
        AND data_type = 'USER-DEFINED'
    ) THEN
        -- Alter the column to varchar
        ALTER TABLE documents ALTER COLUMN status TYPE VARCHAR(20);
        
        -- Drop the old enum type if it exists
        DROP TYPE IF EXISTS documentstatus;
    END IF;
END $$;
