import { ThemeProvider } from "@emotion/react";
import {
  createTheme,
  CssBaseline,
  GlobalStyles,
  Snackbar,
} from "@mui/material";
import React from "react";

import Header from "./Header";
import Main from "./Main";
import ProgressDialog from "./ProgressDialog";

const globalStyles = (
  <GlobalStyles styles={{ "html, body, #root": { height: "100%" } }} />
);

const theme = createTheme({
  palette: { primary: { main: "#f38020" } },
});

function App() {
  const [search, setSearch] = React.useState("");
  const [showProgressDialog, setShowProgressDialog] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {globalStyles}
      <Header
        search={search}
        onSearchChange={(newSearch: string) => setSearch(newSearch)}
        setShowProgressDialog={setShowProgressDialog}
      />
      <Main search={search} onError={setError} />
      <Snackbar
        autoHideDuration={5000}
        open={Boolean(error)}
        message={error?.message}
        onClose={() => setError(null)}
      />
      <ProgressDialog
        open={showProgressDialog}
        onClose={() => setShowProgressDialog(false)}
      />
    </ThemeProvider>
  );
}

export default App;
