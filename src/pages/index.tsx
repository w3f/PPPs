import * as React from "react"
import { Link, graphql } from 'gatsby'

const IndexPage = ({ data: { metadata, proposals } }) => {
  return (
    <main>
      <h1>{metadata.siteMetadata.title}</h1>
      {
        proposals.nodes.map(node => (
          <article key={node.id}>
            <h2>
              <Link to={`/${node.frontmatter.Number}`}>
                {node.frontmatter.Title}
              </Link>
            </h2>
            <p>Created: {node.frontmatter.Created}</p>
            <p>Category: {node.frontmatter.Category}</p>
          </article>
        ))
      }
    </main>
  )
}

export const query = graphql`{
  metadata: site {
    siteMetadata {
      title
    }
  }

  proposals: allMarkdownRemark {
    nodes {
      frontmatter {
        Title
        Number
        Created
        Category
      }
      id
      html
    }
  }
}`

export default IndexPage
