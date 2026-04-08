import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/hooks/useMembers';
import {
  useFamilyGameWeights,
  useUpsertFamilyGameWeight,
  useFamilyBonusPoints,
  useAddFamilyBonusPoints,
  useDeleteFamilyBonusPoints,
} from '@/hooks/useFamilyGames';
import { org } from '@/config/org';

const SCORED_CATEGORIES = org.scoredCategories;

export function FamilyGamesManager() {
  const { user } = useAuth();
  const { data: members = [] } = useMembers();
  const { data: weights = [] } = useFamilyGameWeights();
  const upsertWeight = useUpsertFamilyGameWeight();
  const { data: bonusPoints = [] } = useFamilyBonusPoints();
  const addBonus = useAddFamilyBonusPoints();
  const deleteBonus = useDeleteFamilyBonusPoints();

  const [bonusFamily, setBonusFamily] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusReason, setBonusReason] = useState('');

  const families = [...new Set(
    members
      .filter(m => (m.status === 'active' || m.status === 'new_member') && m.family)
      .map(m => m.family!)
  )].sort();

  const getWeight = (category: string) => {
    const w = weights.find(w => w.category === category);
    return w ? Number(w.weight) : 1;
  };

  const handleAddBonus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusFamily || !bonusAmount || !bonusReason) return;
    addBonus.mutate(
      { family_name: bonusFamily, points: parseInt(bonusAmount), reason: bonusReason, granted_by: user?.id },
      { onSuccess: () => { setBonusFamily(''); setBonusAmount(''); setBonusReason(''); } }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-display text-base font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" /> Family Games Settings
        </h4>
        <p className="text-sm text-muted-foreground">Configure category weights and manage bonus points</p>
      </div>

      {/* Category Weights */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Category Weights</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Score = (members with point / total family members) × weight, summed across categories + bonus points
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {SCORED_CATEGORIES.map(cat => (
              <div key={cat} className="space-y-1">
                <Label className="text-xs capitalize">{cat}</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={getWeight(cat)}
                  onChange={(e) => upsertWeight.mutate({ category: cat, weight: parseFloat(e.target.value) || 0 })}
                  className="h-8"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bonus Points */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Manual Bonus Points</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAddBonus} className="flex flex-col sm:flex-row gap-2">
            <Select value={bonusFamily} onValueChange={setBonusFamily}>
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue placeholder="Family" />
              </SelectTrigger>
              <SelectContent>
                {families.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Points"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              className="w-full sm:w-24 h-9"
              min="1"
            />
            <Input
              placeholder="Reason / Name"
              value={bonusReason}
              onChange={(e) => setBonusReason(e.target.value)}
              className="flex-1 h-9"
            />
            <Button type="submit" size="sm" disabled={addBonus.isPending} className="h-9">
              <Plus className="h-4 w-4 mr-1" />Add
            </Button>
          </form>

          {bonusPoints.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Family</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-center">Points</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonusPoints.map(bp => (
                  <TableRow key={bp.id}>
                    <TableCell className="font-medium text-sm">{bp.family_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{bp.reason}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{bp.points}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteBonus.mutate(bp.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
