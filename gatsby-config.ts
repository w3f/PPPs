import type { GatsbyConfig } from "gatsby";

const config: GatsbyConfig = {
  siteMetadata: {
    title: `Polkadot Protocol Proposals`,
    siteUrl: `https://ppps.polkadot.network`
  },
  // More easily incorporate content into your pages through automatic TypeScript type generation and better GraphQL IntelliSense.
  // If you use VSCode you can also use the GraphQL plugin
  // Learn more at: https://gatsby.dev/graphql-typegen
  graphqlTypegen: true,
  plugins: [
    "gatsby-plugin-sitemap", 
    {
      resolve: 'gatsby-plugin-manifest',
      options: { "icon": "src/images/icon.png" },
    }, 
    "gatsby-transformer-remark",
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: "proposals",
        path: "./proposals/",
	ignore: [ "**/0000-template\.md" ],
      },
    }
  ]
};

export default config;
