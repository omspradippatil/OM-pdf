import React from 'react';
import { useExport } from '../context/ExportContext';
import { Link, useParams } from 'react-router-dom';
import SEO from '../components/SEO';
import { getBlogPost } from '../constants/blogPosts';

export default function BlogPost() {
  const { slug } = useParams();
  const post = getBlogPost(slug);

  if (!post) {
    return (
      <div className="content-page">
        <SEO
          title="Blog Post Not Found"
          description="The blog post you are looking for does not exist."
          url="https://om-pdf.pages.dev/blog"
        />
        <div className="content-page-inner">
          <h1>Post not found</h1>
          <p>The article you are looking for does not exist.</p>
          <Link className="text-link" to="/blog">Back to blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="content-page">
      <SEO
        title={post.title}
        description={post.description}
        url={`https://om-pdf.pages.dev/blog/${post.slug}`}
      />

      <div className="content-page-inner blog-content">
        <Link className="text-link" to="/blog">Back to blog</Link>
        <h1>{post.title}</h1>
        <div className="blog-card-meta">
          <span>{post.date}</span>
          <span>{post.readingTime}</span>
        </div>
        <p>{post.description}</p>

        {post.sections.map((section) => (
          <section key={section.heading} className="blog-section">
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
