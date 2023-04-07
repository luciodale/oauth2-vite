import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { authorize, useOAuth2 } from "@luciodale/oauth2";

useOAuth2();

const resource_server = "https://home.juxt.site";
const authorization_server = "https://auth.home.juxt.site";
const app_server = "https://surveyor.apps.com";

function App() {
  const authorizeFn = () =>
    authorize({
      origin: resource_server,
      client_id: "surveyor",
      authorization_endpoint: `${authorization_server}/oauth/authorize`,
      token_endpoint: `${authorization_server}/oauth/token`,
      redirect_uri: `${app_server}/oauth-redirect.html`,
      requested_scopes: [],
    });

  async function fetchUsers() {
    const a = await fetch(`${resource_server}/_site/users`, {
      headers: {
        accept: "application/json",
      },
    });
    const res = await a.json();
    console.log(res);
  }

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <div onClick={fetchUsers}> fetch users!</div>
      <h1>OAuth2</h1>
      <div className="card">
        <button onClick={authorizeFn}>Authorize</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  );
}

export default App;
