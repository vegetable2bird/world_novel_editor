import { useMemo } from 'react';
import {
  Box,
  Typography,
  Alert,
  Chip,
  Stack,
  Divider,
  Paper,
  Tooltip,
  Button,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { buildCrossBookReport } from '../../services/crossBook/continuity';
import type { WorldBundle } from '../../store/types';
import type {
  CrossBookConflict,
  CrossBookReport,
  CharacterContinuityRow,
} from '../../types/crossBook';

const STATUS_COLOR: Record<string, 'success' | 'default' | 'warning'> = {
  active: 'success',
  minor: 'default',
  offstage: 'warning',
};

const STATUS_LABELS: Record<string, string> = {
  active: '登场',
  minor: '配角',
  offstage: '暂离场',
};

interface CrossBookPanelProps {
  bundle: WorldBundle;
  /** 点击某卷时回调（用于跳转到该卷的角色卡标签） */
  onLocate?: (bookId: string) => void;
}

/** 跨书联动面板：冲突检测 + 跨书角色联动矩阵。 */
export default function CrossBookPanel({
  bundle,
  onLocate,
}: CrossBookPanelProps): JSX.Element {
  const report: CrossBookReport = useMemo(
    () => buildCrossBookReport(bundle),
    [bundle],
  );

  if (report.characterCount === 0) {
    return (
      <Alert severity="info">
        总库暂无角色。先到「角色总库」创建可跨书出演的人物，再回到此处查看跨书联动与一致性。
      </Alert>
    );
  }

  return (
    <Box>
      {/* 统计概览 */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={`作品 ${report.bookCount} 部`} />
        <Chip size="small" label={`总库角色 ${report.characterCount}`} />
        <Chip
          size="small"
          color="info"
          label={`跨书出演 ${report.crossBookCharacterCount}`}
        />
        <Chip
          size="small"
          color={report.conflicts.length > 0 ? 'warning' : 'success'}
          label={`一致性冲突 ${report.conflicts.length}`}
        />
      </Stack>

      {/* 冲突检测面板 */}
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        跨书一致性检测
      </Typography>
      {report.conflicts.length === 0 ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          未检测到跨书一致性问题。各卷化身名与状态均自洽。
        </Alert>
      ) : (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {report.conflicts.map((c) => (
            <ConflictCard key={c.id} conflict={c} onLocate={onLocate} />
          ))}
        </Stack>
      )}

      <Divider sx={{ my: 2 }} />

      {/* 跨书角色联动矩阵 */}
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        跨书角色联动矩阵
      </Typography>
      {report.rows.length === 0 ? (
        <Alert severity="info">尚无角色在作品间跨书出演。</Alert>
      ) : (
        <Stack spacing={1}>
          {report.rows.map((row) => (
            <ContinuityRowCard key={row.registryId} row={row} onLocate={onLocate} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

function ConflictCard({
  conflict,
  onLocate,
}: {
  conflict: CrossBookConflict;
  onLocate?: (bookId: string) => void;
}): JSX.Element {
  const severity = conflict.severity;
  return (
    <Alert
      severity={severity}
      icon={severity === 'warning' ? <WarningAmberIcon /> : undefined}
    >
      <Box>
        <Typography variant="subtitle2" fontWeight={600}>
          {conflict.subjectLabel}
        </Typography>
        <Typography variant="body2">{conflict.description}</Typography>
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
          {conflict.occurrences.map((o, idx) => (
            <Tooltip key={idx} title={`在《${o.bookName}》中的取值`}>
              <Chip
                size="small"
                variant="outlined"
                label={`${o.bookName}：${o.value}`}
                onClick={onLocate ? () => onLocate(o.bookId) : undefined}
                clickable={!!onLocate}
              />
            </Tooltip>
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          建议：{conflict.hint}
        </Typography>
      </Box>
    </Alert>
  );
}

function ContinuityRowCard({
  row,
  onLocate,
}: {
  row: CharacterContinuityRow;
  onLocate?: (bookId: string) => void;
}): JSX.Element {
  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="subtitle1">{row.name}</Typography>
        <Chip size="small" label={row.archetype} />
        {row.conflicted && (
          <Tooltip title="该角色存在跨书一致性冲突">
            <WarningAmberIcon fontSize="small" color="warning" />
          </Tooltip>
        )}
        {row.appearances.length >= 2 && (
          <Chip size="small" color="info" label={`跨书 ${row.appearances.length} 卷`} />
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        出演卷目与状态：
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
        {row.appearances.map((a) => (
          <Button
            key={a.instanceId}
            size="small"
            variant="outlined"
            onClick={onLocate ? () => onLocate(a.bookId) : undefined}
            disabled={!onLocate}
            sx={{ textTransform: 'none' }}
          >
            <Chip
              size="small"
              color={STATUS_COLOR[a.status]}
              label={`${a.bookName}·${STATUS_LABELS[a.status]}`}
              sx={{ mr: 0.5 }}
            />
            {a.latestMood ? `（${a.latestMood}）` : ''}
          </Button>
        ))}
      </Stack>
    </Paper>
  );
}
