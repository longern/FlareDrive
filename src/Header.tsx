import { IconButton, InputBase, Menu, MenuItem, Toolbar, Box, Tooltip, Chip, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useState } from "react";
import { 
  Search as SearchIcon, 
  Tune as TuneIcon,
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  Sort as SortIcon,
  SortByAlpha as SortByAlphaIcon,
  Storage as StorageIcon,
  Schedule as ScheduleIcon
} from "@mui/icons-material";
import LogoutButton from "./LogoutButton";

function Header({
  search,
  onSearchChange,
  totalFiles,
  filteredCount,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  useFuzzySearch,
  onFuzzySearchChange,
}: {
  search: string;
  onSearchChange: (newSearch: string) => void;
  totalFiles?: number;
  filteredCount?: number;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortBy: 'name' | 'size' | 'date';
  onSortByChange: (sort: 'name' | 'size' | 'date') => void;
  useFuzzySearch: boolean;
  onFuzzySearchChange: (fuzzy: boolean) => void;
}) {
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);

  const getSortIcon = () => {
    switch(sortBy) {
      case 'name': return <SortByAlphaIcon fontSize="small" />;
      case 'size': return <StorageIcon fontSize="small" />;
      case 'date': return <ScheduleIcon fontSize="small" />;
      default: return <SortIcon fontSize="small" />;
    }
  };

  return (
    <Toolbar disableGutters sx={{ padding: 1, gap: 1 }}>
      <Box sx={{ position: 'relative', flexGrow: 1 }}>
        <InputBase
          size="small"
          fullWidth
          placeholder={useFuzzySearch ? "Search… (fuzzy)" : "Search… (exact)"}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          startAdornment={
            <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
          }
          sx={{
            backgroundColor: "whitesmoke",
            borderRadius: "999px",
            padding: "8px 16px",
            paddingLeft: "12px",
          }}
        />
        
        {/* Search results info */}
        {search && totalFiles !== undefined && filteredCount !== undefined && (
          <Chip
            label={`${filteredCount}/${totalFiles}`}
            size="small"
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'primary.main',
              color: 'white',
              height: 20,
              fontSize: '0.75rem'
            }}
          />
        )}
      </Box>
      
      {/* Fuzzy search toggle */}
      <Tooltip title={useFuzzySearch ? "Switch to exact search" : "Switch to fuzzy search"}>
        <IconButton
          size="small"
          onClick={() => onFuzzySearchChange(!useFuzzySearch)}
          sx={{ 
            color: useFuzzySearch ? 'primary.main' : 'text.secondary',
            backgroundColor: useFuzzySearch ? 'primary.light' : 'transparent',
            '&:hover': {
              backgroundColor: useFuzzySearch ? 'primary.light' : 'action.hover'
            }
          }}
        >
          <TuneIcon />
        </IconButton>
      </Tooltip>

      {/* View Mode Toggle */}
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={(_, newMode) => newMode && onViewModeChange(newMode)}
        size="small"
        sx={{ height: 36 }}
      >
        <ToggleButton value="grid" aria-label="grid view">
          <Tooltip title="Grid view">
            <GridViewIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="list" aria-label="list view">
          <Tooltip title="List view">
            <ListViewIcon fontSize="small" />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Sort button with menu */}
      <Box>
        <Tooltip title={`Sort by ${sortBy}`}>
          <IconButton
            size="small"
            onClick={(e) => setSortMenuAnchor(e.currentTarget)}
            sx={{ 
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            {getSortIcon()}
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={sortMenuAnchor}
          open={Boolean(sortMenuAnchor)}
          onClose={() => setSortMenuAnchor(null)}
        >
          <MenuItem 
            selected={sortBy === 'name'}
            onClick={() => {
              onSortByChange('name');
              setSortMenuAnchor(null);
            }}
          >
            <SortByAlphaIcon sx={{ mr: 1, fontSize: 20 }} />
            Name
          </MenuItem>
          <MenuItem 
            selected={sortBy === 'size'}
            onClick={() => {
              onSortByChange('size');
              setSortMenuAnchor(null);
            }}
          >
            <StorageIcon sx={{ mr: 1, fontSize: 20 }} />
            Size
          </MenuItem>
          <MenuItem 
            selected={sortBy === 'date'}
            onClick={() => {
              onSortByChange('date');
              setSortMenuAnchor(null);
            }}
          >
            <ScheduleIcon sx={{ mr: 1, fontSize: 20 }} />
            Date Modified
          </MenuItem>
        </Menu>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <LogoutButton variant="icon" />
      </Box>
    </Toolbar>
  );
}

export default Header;
