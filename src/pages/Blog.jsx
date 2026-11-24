import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { FaLinkedinIn, FaMedium } from 'react-icons/fa';

import blogArticles from '../data/blogArticles';
import SEO from '../components/SEO';
import siteConfig from '../config/siteConfig';

import './Blog.css';

function Blog() {
  const featuredArticle = blogArticles[0];
  const otherArticles = blogArticles.slice(1);

  return (
    <main className="blog-page">

      <SEO
        title="MAISON Journal | Fashion, Lifestyle & Inspiration"
        description="Explore the MAISON Journal for fashion trends, lifestyle inspiration, interior ideas, technology and stories that help you express your personal style."
      />

      {/* EDITORIAL HERO */}

      <section className="blog-hero">
        <div className="blog-hero-image"></div>

        <div className="blog-hero-content">
          <span className="blog-eyebrow">
            THE MAISON JOURNAL · EST. 2026
          </span>

          <h1>
            Inspiration
            <br />
            Begins with Style.
          </h1>

          <a href="#latest-stories" className="blog-hero-button">
            DISCOVER OUR STORIES
            <ArrowRight size={17} />
          </a>
        </div>

        <div className="blog-hero-bottom">
          <span>FASHION · LIFESTYLE · CULTURE</span>
          <span>01 — 06</span>
        </div>
      </section>

      {/* INTRODUCTION */}

      <section className="blog-intro">
        <div>
          <span className="blog-section-label">
            WELCOME TO OUR WORLD
          </span>

          <h2>
            Inspiration for
            <br />
            Every Side of You.
          </h2>
        </div>

        <p>
          More than a collection of products, MAISON is a
          celebration of personal expression. Explore fresh
          perspectives on fashion, interiors, technology and
          the little things that make life beautiful.
        </p>
      </section>

      {/* FEATURED ARTICLE */}

      <section className="blog-featured">
        <div className="featured-image">
          <img
            src={featuredArticle.image}
            alt={featuredArticle.title}
          />
        </div>

        <div className="featured-content">
          <span className="blog-section-label">
            EDITOR'S PICK · {featuredArticle.category}
          </span>

          <h2>{featuredArticle.title}</h2>

          <p>{featuredArticle.description}</p>

          <Link
            to={`/blog/${featuredArticle.slug}`}
            className="blog-text-link"
          >
            READ THE FULL STORY
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>

      {/* LATEST STORIES */}

      <section className="blog-stories" id="latest-stories">

        <div className="blog-stories-heading">
          <div>
            <span className="blog-section-label">
              THE LATEST EDIT
            </span>

            <h2>Stories & Inspiration</h2>
          </div>

          <span className="stories-count">
            05 STORIES
          </span>
        </div>

        <div className="blog-grid">

          {otherArticles.map((article, index) => (
            <article className="blog-card" key={article.id}>

              <Link
                to={`/blog/${article.slug}`}
                className="blog-card-image"
              >
                <img
                  src={article.image}
                  alt={article.title}
                />

                <span className="blog-card-number">
                  0{index + 2}
                </span>

                <span className="blog-image-arrow">
                  <ArrowUpRight size={20} />
                </span>
              </Link>

              <div className="blog-card-content">

                <span className="blog-card-category">
                  {article.category}
                </span>

                <h3>{article.title}</h3>

                <p>{article.description}</p>

                <Link
                  to={`/blog/${article.slug}`}
                  className="blog-card-link"
                >
                  READ THE STORY
                  <ArrowRight size={15} />
                </Link>

              </div>
            </article>
          ))}

        </div>
      </section>

      <section className="blog-platforms">
        <div>
          <span className="blog-section-label">FOLLOW THE JOURNAL</span>
          <h2>More stories, wherever you read.</h2>
          <p>
            Our LinkedIn and Medium publications are ready to connect when
            the official MAISON profiles become available.
          </p>
        </div>

        <div className="blog-platform-links">
          {siteConfig.social.linkedin ? (
            <a href={siteConfig.social.linkedin} target="_blank" rel="noreferrer">
              <FaLinkedinIn /> LinkedIn <ArrowUpRight size={16} />
            </a>
          ) : (
            <span className="is-disabled">
              <FaLinkedinIn /> LinkedIn coming soon
            </span>
          )}

          {siteConfig.social.medium ? (
            <a href={siteConfig.social.medium} target="_blank" rel="noreferrer">
              <FaMedium /> Medium <ArrowUpRight size={16} />
            </a>
          ) : (
            <span className="is-disabled">
              <FaMedium /> Medium coming soon
            </span>
          )}
        </div>
      </section>

      {/* BRAND CLOSING */}

      <section className="blog-closing">
        <span>THE MAISON PHILOSOPHY</span>

        <h2>
          Own Your Style.
          <br />
          Elevate Your Lifestyle.
        </h2>

        <p>
          Discover products that reflect who you are.
        </p>

        <Link to="/shop">
          EXPLORE MAISON
          <ArrowRight size={17} />
        </Link>
      </section>

    </main>
  );
}

export default Blog;
