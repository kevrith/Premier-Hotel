import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { recipesApi, Recipe, RecipeCreate } from '@/lib/api/recipes';
import { toast } from 'react-hot-toast';

interface Recipe {
  id: string;
  name: string;
  category: string;
  prepTime: number;
  servings: number;
  ingredients: string[];
  steps: string[];
  notes?: string;
}

const recipes: Recipe[] = [
  {
    id: '1',
    name: 'Grilled Salmon',
    category: 'Main Course',
    prepTime: 15,
    servings: 1,
    ingredients: [
      'Salmon fillet - 200g',
      'Lemon - 1/2 piece',
      'Olive oil - 2 tbsp',
      'Salt - to taste',
      'Black pepper - to taste',
      'Fresh dill - for garnish'
    ],
    steps: [
      'Season salmon fillet with salt and pepper on both sides',
      'Heat grill to medium-high heat (around 400°F)',
      'Brush salmon with olive oil',
      'Place salmon skin-side down on grill',
      'Grill for 4-5 minutes per side until internal temp reaches 145°F',
      'Remove from grill and let rest for 2 minutes',
      'Drizzle with lemon juice and olive oil',
      'Garnish with fresh dill'
    ],
    notes: 'Do not overcook - salmon should be slightly pink in the center'
  },
  {
    id: '2',
    name: 'Caesar Salad',
    category: 'Salad',
    prepTime: 10,
    servings: 1,
    ingredients: [
      'Romaine lettuce - 150g',
      'Caesar dressing - 50ml',
      'Croutons - 30g',
      'Parmesan cheese - 20g, grated',
      'Lemon wedge - 1 piece',
      'Black pepper - to taste'
    ],
    steps: [
      'Wash and thoroughly dry romaine lettuce',
      'Chop lettuce into bite-sized pieces',
      'Place lettuce in large mixing bowl',
      'Add Caesar dressing and toss until evenly coated',
      'Add croutons and half the parmesan',
      'Toss gently to combine',
      'Transfer to serving plate',
      'Top with remaining parmesan',
      'Add fresh black pepper',
      'Serve with lemon wedge'
    ]
  },
  {
    id: '3',
    name: 'Margherita Pizza',
    category: 'Main Course',
    prepTime: 20,
    servings: 1,
    ingredients: [
      'Pizza dough - 250g (stretched to 12 inch)',
      'Tomato sauce - 100g',
      'Fresh mozzarella - 150g, sliced',
      'Fresh basil leaves - 8-10 pieces',
      'Extra virgin olive oil - 2 tbsp',
      'Salt - pinch',
      'Garlic powder - pinch (optional)'
    ],
    steps: [
      'Preheat oven to 450°F (230°C) with pizza stone inside',
      'Stretch dough to 12-inch circle on floured surface',
      'Spread tomato sauce evenly, leaving 1-inch border',
      'Arrange mozzarella slices evenly over sauce',
      'Season with salt and optional garlic powder',
      'Transfer to preheated pizza stone',
      'Bake for 12-15 minutes until crust is golden and cheese bubbles',
      'Remove from oven',
      'Immediately add fresh basil leaves',
      'Drizzle with olive oil',
      'Let cool for 2 minutes before slicing'
    ],
    notes: 'High heat is crucial for crispy crust. Do not overload with toppings.'
  },
  {
    id: '4',
    name: 'Beef Burger',
    category: 'Main Course',
    prepTime: 12,
    servings: 1,
    ingredients: [
      'Ground beef (80/20) - 180g',
      'Burger bun - 1 piece',
      'Cheese slice - 1 piece',
      'Lettuce - 2 leaves',
      'Tomato - 2 slices',
      'Onion - 2 slices',
      'Pickle - 3 slices',
      'Ketchup - 1 tbsp',
      'Mustard - 1 tsp',
      'Salt & pepper - to taste'
    ],
    steps: [
      'Form ground beef into patty (3/4 inch thick)',
      'Season both sides with salt and pepper',
      'Heat grill or pan to medium-high',
      'Cook patty for 4 minutes on first side',
      'Flip and add cheese slice',
      'Cook for 3-4 minutes more for medium doneness',
      'Toast bun on grill for 30 seconds',
      'Spread ketchup and mustard on bottom bun',
      'Add lettuce, tomato, and onion',
      'Place patty on vegetables',
      'Add pickles on top',
      'Cover with top bun'
    ],
    notes: 'Do not press down on patty while cooking - this releases juices'
  },
  {
    id: '5',
    name: 'Pasta Carbonara',
    category: 'Main Course',
    prepTime: 18,
    servings: 1,
    ingredients: [
      'Spaghetti - 100g',
      'Bacon/Pancetta - 80g, diced',
      'Egg yolk - 2 pieces',
      'Parmesan cheese - 40g, grated',
      'Black pepper - freshly ground',
      'Salt - for pasta water',
      'Pasta water - 50ml reserved'
    ],
    steps: [
      'Bring large pot of salted water to boil',
      'Add spaghetti and cook until al dente (8-10 min)',
      'While pasta cooks, fry bacon until crispy',
      'In bowl, whisk egg yolks with half the parmesan',
      'Add generous black pepper to egg mixture',
      'Reserve 50ml pasta water before draining',
      'Add hot drained pasta to bacon pan (off heat)',
      'Quickly add egg mixture, tossing constantly',
      'Add pasta water gradually to create creamy sauce',
      'Continue tossing for 1 minute',
      'Plate immediately',
      'Top with remaining parmesan and black pepper'
    ],
    notes: 'Work quickly and off heat when adding eggs to prevent scrambling'
  }
];

export function RecipeReference() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [formData, setFormData] = useState<RecipeCreate>({
    name: '',
    category: '',
    prep_time: 15,
    servings: 1,
    ingredients: [''],
    steps: [''],
    notes: '',
  });

  const canEdit = user?.role === 'chef' || user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const data = await recipesApi.getAll();
      setRecipes(data);
    } catch (error) {
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category || formData.ingredients.filter(i => i).length === 0 || formData.steps.filter(s => s).length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const cleanData = {
        ...formData,
        ingredients: formData.ingredients.filter(i => i.trim()),
        steps: formData.steps.filter(s => s.trim()),
      };

      if (editingRecipe) {
        await recipesApi.update(editingRecipe.id, cleanData);
        toast.success('Recipe updated!');
      } else {
        await recipesApi.create(cleanData);
        toast.success('Recipe created!');
      }
      setShowDialog(false);
      resetForm();
      loadRecipes();
    } catch (error) {
      toast.error('Failed to save recipe');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recipe?')) return;
    try {
      await recipesApi.delete(id);
      toast.success('Recipe deleted');
      loadRecipes();
    } catch (error) {
      toast.error('Failed to delete recipe');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      prep_time: 15,
      servings: 1,
      ingredients: [''],
      steps: [''],
      notes: '',
    });
    setEditingRecipe(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditDialog = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name,
      category: recipe.category,
      prep_time: recipe.prep_time,
      servings: recipe.servings,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      notes: recipe.notes || '',
    });
    setShowDialog(true);
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-14 text-lg"
          />
        </div>
        {canEdit && (
          <Button onClick={openCreateDialog} size="lg" className="h-14">
            <Plus className="h-5 w-5 mr-2" />
            Create Recipe
          </Button>
        )}
      </div>

      {/* Recipes Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {filteredRecipes.map((recipe) => (
          <Card key={recipe.id} className="overflow-hidden">
            <CardHeader className="bg-muted/50">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {recipe.name}
                    {canEdit && (
                      <div className="ml-auto flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(recipe)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(recipe.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-2 flex items-center gap-4">
                    <Badge variant="secondary">{recipe.category}</Badge>
                    <span className="flex items-center gap-1 text-sm">
                      <Clock className="h-4 w-4" />
                      {recipe.prepTime} min
                    </span>
                    <span className="text-sm">Serves: {recipe.servings}</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Ingredients */}
              <div>
                <h4 className="font-bold text-base mb-3 text-primary">Ingredients</h4>
                <div className="grid gap-2">
                  {recipe.ingredients.map((ingredient, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-bold">•</span>
                      <span>{ingredient}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Steps */}
              <div>
                <h4 className="font-bold text-base mb-3 text-primary">Preparation Steps</h4>
                <div className="space-y-3">
                  {recipe.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <p className="text-sm pt-1 flex-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {recipe.notes && (
                <>
                  <Separator />
                  <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
                    <p className="text-sm font-semibold text-yellow-800 mb-1">⚠️ Important Notes:</p>
                    <p className="text-sm text-yellow-700">{recipe.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No recipes found matching "{searchTerm}"</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecipe ? 'Edit Recipe' : 'Create Recipe'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g., Main Course, Salad" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prep Time (min)</Label>
                <Input type="number" value={formData.prep_time} onChange={(e) => setFormData({ ...formData, prep_time: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label>Servings</Label>
                <Input type="number" value={formData.servings} onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Ingredients</Label>
              {formData.ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input value={ing} onChange={(e) => {
                    const newIng = [...formData.ingredients];
                    newIng[i] = e.target.value;
                    setFormData({ ...formData, ingredients: newIng });
                  }} />
                  <Button variant="outline" onClick={() => setFormData({ ...formData, ingredients: formData.ingredients.filter((_, idx) => idx !== i) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setFormData({ ...formData, ingredients: [...formData.ingredients, ''] })}>
                <Plus className="h-4 w-4 mr-2" /> Add Ingredient
              </Button>
            </div>
            <div>
              <Label>Steps</Label>
              {formData.steps.map((step, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Textarea value={step} onChange={(e) => {
                    const newSteps = [...formData.steps];
                    newSteps[i] = e.target.value;
                    setFormData({ ...formData, steps: newSteps });
                  }} />
                  <Button variant="outline" onClick={() => setFormData({ ...formData, steps: formData.steps.filter((_, idx) => idx !== i) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => setFormData({ ...formData, steps: [...formData.steps, ''] })}>
                <Plus className="h-4 w-4 mr-2" /> Add Step
              </Button>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingRecipe ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
