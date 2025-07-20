import React from "react";
import { AuthProvider } from "../context/AuthContext";
import Layout from "../components/Layout";
import "../styles/global.css";
import '../styles/date-range-dark.css';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}
 