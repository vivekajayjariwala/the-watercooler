-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  title TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK ( (select auth.uid()) = id );

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING ( (select auth.uid()) = id )
  WITH CHECK ( (select auth.uid()) = id );

-- Create interests table
CREATE TABLE public.interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Insert some default interests
INSERT INTO public.interests (name) VALUES
  ('Coffee'),
  ('Tea'),
  ('Software Engineering'),
  ('Design'),
  ('Product Management'),
  ('Hiking'),
  ('Board Games'),
  ('Reading'),
  ('Music');

-- Enable RLS
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;

-- Interests Policies (Read only for users)
CREATE POLICY "Interests are viewable by everyone."
  ON public.interests FOR SELECT
  USING ( true );

-- Create user_interests join table
CREATE TABLE public.user_interests (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_id UUID REFERENCES public.interests(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, interest_id)
);

-- Enable RLS
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- User Interests Policies
CREATE POLICY "User interests are viewable by everyone."
  ON public.user_interests FOR SELECT
  USING ( true );

CREATE POLICY "Users can insert their own interests."
  ON public.user_interests FOR INSERT
  WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can delete their own interests."
  ON public.user_interests FOR DELETE
  USING ( (select auth.uid()) = user_id );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$;

-- Trigger to automatically create profile for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create coffee_chats table
CREATE TABLE public.coffee_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  initiator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  scheduled_time TIMESTAMPTZ,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.coffee_chats ENABLE ROW LEVEL SECURITY;

-- Coffee Chats Policies
CREATE POLICY "Users can view chats they are part of."
  ON public.coffee_chats FOR SELECT
  USING ( (select auth.uid()) IN (initiator_id, recipient_id) );

CREATE POLICY "Users can insert chats where they are the initiator."
  ON public.coffee_chats FOR INSERT
  WITH CHECK ( (select auth.uid()) = initiator_id );

CREATE POLICY "Users can update chats they are part of."
  ON public.coffee_chats FOR UPDATE
  USING ( (select auth.uid()) IN (initiator_id, recipient_id) )
  WITH CHECK ( (select auth.uid()) IN (initiator_id, recipient_id) );
