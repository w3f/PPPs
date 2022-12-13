import * as React from "react"
import { graphql } from "gatsby"

function ProposalTemplate({ data }) {
  const post = data.markdownRemark
  return (
    <div>
      <h1>{post.frontmatter.Title}</h1>
      <div dangerouslySetInnerHTML={{ __html: post.html }} />
    </div>
  )
}

export default ProposalTemplate

export const pageQuery = graphql`
query($id: String!) {
  markdownRemark(id: {eq: $id}) {
    frontmatter {
      Title
      Number
    }
    html
  }
}
`
