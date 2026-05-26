import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';

const awsConfig = {
  aws_project_region: "us-east-1",
  aws_appsync_graphqlEndpoint: "https://3jez6mafrnagxbhksoscsek6xy.appsync-api.us-east-1.amazonaws.com/graphql",
  aws_appsync_region: "us-east-1",
  aws_appsync_authenticationType: "AMAZON_COGNITO_USER_POOLS",
  aws_cognito_identity_pool_id: "us-east-1:e695b46b-17b4-44c5-9299-09c25c830239",
  aws_cognito_region: "us-east-1",
  aws_user_pools_id: "us-east-1_qxX7fCmYF",
  aws_user_pools_web_client_id: "4bmj640b2hrd87vvinvi1ff01c",
  oauth: {},
  aws_cognito_username_attributes: ["EMAIL"],
  aws_cognito_social_providers: [],
  aws_cognito_signup_attributes: ["EMAIL"],
  aws_cognito_mfa_configuration: "OFF",
  aws_cognito_mfa_types: ["SMS"],
  aws_cognito_password_protection_settings: {
    passwordPolicyMinLength: 8,
    passwordPolicyCharacters: []
  },
  aws_cognito_verification_mechanisms: ["EMAIL"]
};

Amplify.configure(awsConfig);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();