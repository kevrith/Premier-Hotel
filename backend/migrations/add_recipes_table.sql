-- Add recipes table for chef recipe management
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    prep_time INTEGER NOT NULL,
    servings INTEGER NOT NULL DEFAULT 1,
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX idx_recipes_category ON public.recipes(category);
CREATE INDEX idx_recipes_created_by ON public.recipes(created_by);

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipes are viewable by everyone"
    ON public.recipes FOR SELECT USING (true);

CREATE POLICY "Chefs can create recipes"
    ON public.recipes FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('chef', 'manager', 'admin')
    ));

CREATE POLICY "Creators can update own recipes"
    ON public.recipes FOR UPDATE
    USING (created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('manager', 'admin')
    ));

CREATE POLICY "Creators can delete own recipes"
    ON public.recipes FOR DELETE
    USING (created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('manager', 'admin')
    ));
