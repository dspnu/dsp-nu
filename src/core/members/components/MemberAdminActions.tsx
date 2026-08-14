import { useState } from 'react';
import { MoreHorizontal, Shield, ShieldCheck } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AdminRoleDialog } from '@/core/members/components/AdminRoleDialog';
import { AdminPositionsDialog } from '@/core/members/components/AdminPositionsDialog';

interface MemberAdminActionsProps {
  member: Tables<'profiles'>;
  canManageAdminRoles: boolean;
  canManagePositions: boolean;
}

export function MemberAdminActions({
  member,
  canManageAdminRoles,
  canManagePositions,
}: MemberAdminActionsProps) {
  const [adminOpen, setAdminOpen] = useState(false);
  const [positionsOpen, setPositionsOpen] = useState(false);

  if (!canManageAdminRoles && !canManagePositions) return null;

  return (
    <>
      <div
        className="absolute top-2 right-2"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7 rounded-md bg-background/90 shadow-sm border border-border/60 hover:bg-background"
              aria-label={`Manage ${member.first_name} ${member.last_name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {canManageAdminRoles && (
              <DropdownMenuItem onSelect={() => setAdminOpen(true)}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Admin role
              </DropdownMenuItem>
            )}
            {canManagePositions && (
              <DropdownMenuItem onSelect={() => setPositionsOpen(true)}>
                <Shield className="h-4 w-4 mr-2" />
                Manage positions
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {canManageAdminRoles && (
        <AdminRoleDialog member={member} open={adminOpen} onOpenChange={setAdminOpen} />
      )}
      {canManagePositions && (
        <AdminPositionsDialog member={member} open={positionsOpen} onOpenChange={setPositionsOpen} />
      )}
    </>
  );
}
