-- Allow public/host insert on messages table
-- This enables the Host (and participants) to send messages
-- Date: 2025-12-08

create policy "Enable insert for all users"
on "public"."messages"
as permissive
for insert
to public
with check (true);
