import React from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { useAuth } from './AuthContext';

interface LogoutButtonProps {
  variant?: 'icon' | 'button';
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ variant = 'button' }) => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  if (variant === 'icon') {
    return (
      <Tooltip title="Keluar">
        <IconButton color="inherit" onClick={handleLogout}>
          <LogoutIcon />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Button
      color="inherit"
      startIcon={<LogoutIcon />}
      onClick={handleLogout}
    >
      Keluar
    </Button>
  );
};

export default LogoutButton;