import React from 'react';
import { useExport } from '../context/ExportContext';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { BLOG_POSTS } from '../constants/blogPosts';

export default function Blog() {
  return (
    <div className="content-page">
      <SEO
        title="OM PDF Blog"
        description="Guides, tips, and privacy-first PDF workflows from OM PDF."
        url="https://om-pdf.netlify.app/blog"
      />

      <div className="content-page-inner">
        <h1>OM PDF Blog</h1>
        <p>
          Practical guides for merging, compressing, and converting PDFs while keeping your files private.
        </p>

        <div className="blog-list">
          {BLOG_POSTS.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="blog-card">
              <div className="blog-card-meta">
                <span>{post.date}</span>
                <span>{post.readingTime}</span>
              </div>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              <span className="blog-card-cta">Read article</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
