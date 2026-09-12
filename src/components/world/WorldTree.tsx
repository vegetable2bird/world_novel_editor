import { useState, useMemo } from 'react';
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorldId } from '../../hooks/useWorldState';
import {
  ENTITY_TYPE_LABELS,
  ENTITY_TYPE_ORDER,
} from '../../constants/worldTemplates';
import type { EntityType, WorldEntity } from '../../types/world';

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * 世界树侧栏：按类型分组列出实体，支持选中与快速新增。
 * 选中实体会同步到主区域（详情/编辑）。
 */
export default function WorldTree({ selectedId, onSelect }: Props): JSX.Element {
  const worldId = useCurrentWorldId();
  const entities = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.entities : undefined,
  );
  const addEntity = useWorkStore((s) => s.addEntity);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const grouped = useMemo(() => {
    const map: Record<EntityType, WorldEntity[]> = {
      geography: [],
      faction: [],
      race: [],
      character: [],
      timeline: [],
      rule: [],
    };
    if (entities) {
      for (const e of Object.values(entities)) {
        map[e.type].push(e);
      }
    }
    return map;
  }, [entities]);

  const total = entities ? Object.keys(entities).length : 0;

  const handleAdd = (type: EntityType) => {
    if (!worldId) return;
    const id = addEntity(worldId, {
      type,
      name: `新${ENTITY_TYPE_LABELS[type]}`,
    });
    onSelect(id);
    setAnchorEl(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          世界树 · 共 {total} 个实体
        </Typography>
        <Tooltip title="新增实体">
          <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {ENTITY_TYPE_ORDER.map((t) => (
          <MenuItem key={t} onClick={() => handleAdd(t)}>
            {ENTITY_TYPE_LABELS[t]}
          </MenuItem>
        ))}
      </Menu>
      <Divider />
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        <List dense disablePadding>
          {ENTITY_TYPE_ORDER.map((type) => {
            const list = grouped[type];
            if (list.length === 0) return null;
            return (
              <Box key={type} sx={{ mb: 0.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ pl: 1.5, fontWeight: 700 }}
                >
                  {ENTITY_TYPE_LABELS[type]}（{list.length}）
                </Typography>
                {list.map((e) => (
                  <ListItemButton
                    key={e.id}
                    selected={e.id === selectedId}
                    onClick={() => onSelect(e.id)}
                  >
                    <ListItemText
                      primary={e.name}
                      primaryTypographyProps={{ noWrap: true }}
                    />
                    {!e.inContext && (
                      <Chip
                        size="small"
                        label="隔离"
                        variant="outlined"
                        sx={{ height: 18, fontSize: 10, ml: 1 }}
                      />
                    )}
                  </ListItemButton>
                ))}
              </Box>
            );
          })}
          {total === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ p: 2, textAlign: 'center' }}
            >
              点击右上角 + 开始搭建你的世界
            </Typography>
          )}
        </List>
      </Box>
    </Box>
  );
}
