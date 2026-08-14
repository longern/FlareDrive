import { ThemeProvider } from "@emotion/react";
import {
  createTheme,
  CssBaseline,
  GlobalStyles,
  Snackbar,
  Stack,
} from "@mui/material";
import React, { useState } from "react";

import Header from "./Header";
import Main from "./Main";
import Login from "./Login";
import { AuthProvider, useAuth } from "./AuthContext";

const globalStyles = (
  <GlobalStyles styles={{ "html, body, #root": { height: "100%" } }} />
);

const theme = createTheme({
  palette: { primary: { main: "#f38020" } },
});

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [fileStats, setFileStats] = useState<{ total: number; filtered: number }>({ total: 0, filtered: 0 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [useFuzzySearch, setUseFuzzySearch] = useState(true);

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <React.Fragment>
      <Stack sx={{ height: "100%" }}>
        <Header
          search={search}
          onSearchChange={(newSearch: string) => setSearch(newSearch)}
          totalFiles={fileStats.total}
          filteredCount={fileStats.filtered}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          useFuzzySearch={useFuzzySearch}
          onFuzzySearchChange={setUseFuzzySearch}
        />
        <Main 
          search={search} 
          onError={setError} 
          onFileStatsChange={setFileStats}
          viewMode={viewMode}
          sortBy={sortBy}
          useFuzzySearch={useFuzzySearch}
        />
      </Stack>
      <Snackbar
        autoHideDuration={5000}
        open={Boolean(error)}
        message={error?.message}
        onClose={() => setError(null)}
      />
    </React.Fragment>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {globalStyles}
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
