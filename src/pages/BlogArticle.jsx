import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { FaLinkedinIn, FaMedium } from 'react-icons/fa';

import blogArticles from '../data/blogArticles';
import SEO from '../components/SEO';
import siteConfig from '../config/siteConfig';

import './BlogArticle.css';

function BlogArticle() {
  const { slug } = useParams();

  const article = blogArticles.find(
    item => item.slug === slug
  );

  if (!article) {
    return (
      <main className="article-not-found">

        <SEO
          title="Article Not Found | MAISON Journal"
          description="The requested MAISON Journal article could not be found. Explore our latest fashion and lifestyle stories."
        />

        <h1>Article Not Found</h1>

        <p>Sorry, we couldn't find the story you're looking for.</p>

        <Link to="/blog">
          <ArrowLeft size={17} />
          Back to Journal
        </Link>

      </main>
    );
  }

  const articlePath = `/blog/${article.slug}`;
  const articleUrl = new URL(
    articlePath,
    `${siteConfig.seo.siteUrl || window.location.origin}/`
  ).toString();
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
  const mediumUrl = article.mediumUrl || siteConfig.social.medium;

  return (
    <main className="blog-article-page">

      <SEO
        title={`${article.title} | MAISON Journal`}
        description={article.description}
        image={article.image}
        type="article"
        canonicalPath={articlePath}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.description,
          image: article.image,
          mainEntityOfPage: articleUrl,
          publisher: {
            '@type': 'Organization',
            name: siteConfig.brand.name,
          },
        }}
      />

      {/* ARTICLE HERO */}

      <section className="article-hero">
        <img src={article.image} alt={article.title} />

        <div className="article-hero-overlay"></div>

        <div className="article-hero-content">
          <span>{article.category}</span>

          <h1>{article.title}</h1>

          <p>{article.description}</p>

          <small>THE MAISON JOURNAL · {article.date}</small>
        </div>
      </section>

      {/* ARTICLE CONTENT */}

      <section className="article-main">

        <Link to="/blog" className="article-back-link">
          <ArrowLeft size={17} />
          BACK TO JOURNAL
        </Link>

        <div className="article-body">

          <div className="article-introduction">
            <span>THE MAISON EDIT</span>
            <p>{article.description}</p>
          </div>

          {article.content.map((section, index) => (
            <div className="article-section" key={index}>

              <span className="article-section-number">
                0{index + 1}
              </span>

              <h2>{section.heading}</h2>

              <p>{section.text}</p>

            </div>
          ))}

          <div className="article-share">
            <div>
              <span>SHARE &amp; FOLLOW</span>
              <h2>Continue the conversation.</h2>
              <p>Share this story on LinkedIn or find MAISON on Medium.</p>
            </div>

            <div className="article-share-links">
              <a href={linkedInShareUrl} target="_blank" rel="noreferrer">
                <FaLinkedinIn /> Share on LinkedIn <ArrowUpRight size={15} />
              </a>

              {mediumUrl ? (
                <a href={mediumUrl} target="_blank" rel="noreferrer">
                  <FaMedium /> Read on Medium <ArrowUpRight size={15} />
                </a>
              ) : (
                <span className="is-disabled">
                  <FaMedium /> Medium publication coming soon
                </span>
              )}
            </div>
          </div>

          <div className="article-ending">
            <span>THE MAISON PHILOSOPHY</span>

            <h2>
              Own Your Style.
              <br />
              Elevate Your Lifestyle.
            </h2>

            <Link to="/shop">
              EXPLORE MAISON
              <ArrowRight size={17} />
            </Link>
          </div>

        </div>

      </section>

      {/* BACK TO BLOG */}

      <section className="article-footer">
        <p>Enjoyed this story?</p>

        <h2>Discover More Inspiration.</h2>

        <Link to="/blog">
          EXPLORE MORE STORIES
          <ArrowRight size={17} />
        </Link>
      </section>

    </main>
  );
}

export default BlogArticle;
