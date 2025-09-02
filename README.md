This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## What else?

-   AWS amplify powers all backend resources: https://docs.amplify.aws/react/start/
    -   Cognito Auth: https://docs.amplify.aws/react/build-a-backend/auth/
    -   S3 Storage: https://docs.amplify.aws/react/build-a-backend/storage/
-   GitHub pages hosts the frontend site, deployed automatically with GitHub actions. A simple push to this repo triggers a new deployment, and the site is up and ready in minutes.

    -   This requires AWS credentials to generate the Amplify outputs (the `Build with Amplify` step), configured with the offical AWS action https://github.com/aws-actions/configure-aws-credentials. Quoting for posterity:

        1.  Create an IAM Identity Provider in your AWS account for GitHub OIDC https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws

        2.  Create an IAM Role in your AWS account with a trust policy that allows GitHub
            Actions to assume it:

            <details>
            <summary>GitHub OIDC Trust Policy</summary>

                ```json
                {
                "Version": "2012-10-17",
                "Statement": [
                    {
                    "Effect": "Allow",
                    "Principal": {
                        "Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
                    },
                    "Action": "sts:AssumeRoleWithWebIdentity",
                    "Condition": {
                        "StringEquals": {
                        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                        "token.actions.githubusercontent.com:sub": "repo:<GITHUB_ORG>/<GITHUB_REPOSITORY>:ref:refs/heads/<GITHUB_BRANCH>"
                        }
                    }
                    }
                ]
                }
                ```
                </details>

        3.  Attach permissions to the IAM Role that allow it to access the AWS resources
            you need.
        4.  Add the following to your GitHub Actions workflow:

            <details>
            <summary>Example Workflow</summary>

            ```yaml
            # Need ID token write permission to use OIDC
            permissions:
                id-token: write
            jobs:
                run_job_with_aws:
                    runs-on: ubuntu-latest
                    steps:
                        - name: Configure AWS Credentials
                        uses: aws-actions/configure-aws-credentials@main # Or a specific version
                        with:
                            role-to-assume: <Role ARN you created in step 2>
                            aws-region: <AWS Region you want to use>
                        - name: Additional steps
                        run: |
                            # Your commands that require AWS credentials
                            aws sts get-caller-identity
            ```

            </details>

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

-   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
