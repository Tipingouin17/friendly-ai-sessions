/**
 * Blog Index Page — AIfacilitator
 *
 * SEO target: "AI workshop facilitation blog", "workshop facilitation tips"
 *
 * Design system: aligned with homepage (Index.tsx)
 * - Hero: centred, gradient bg (from-indigo-50 via-white to-violet-50),
 *         decorative orbs, badge pill, gradient headline
 * - Article cards: bg-white rounded-2xl border border-gray-100 shadow-sm
 *                  hover:border-indigo-200 hover:shadow-md (matches feature cards)
 * - CTA: full-width gradient from-indigo-600 to-violet-700, centred, trust signals
 */
import React from 'react';
import { Link } from 'react-router-dom';
import PageHead from '@/components/PageHead';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, CheckCircle2, Clock, Tag } from 'lucide-react';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
}

const posts: BlogPost[] = [
  {
    slug: 'how-to-use-ai-for-workshop-facilitation',
    title: 'How to Use AI for Workshop Facilitation: A Complete Guide',
    excerpt:
      'AI is transforming how teams run workshops. This guide explains exactly how AI facilitation works, when to use it, and how to get the best results from your first AI-facilitated session.',
    date: 'May 7, 2026',
    readTime: '8 min read',
    category: 'Guide',
    tags: ['AI facilitation', 'workshop tools', 'remote teams'],
  },
  {
    slug: 'ai-tools-for-remote-teams',
    title: 'The 7 Best AI Tools for Remote Team Workshops in 2026',
    excerpt:
      'Remote teams face unique challenges when running workshops. We reviewed the top AI-powered tools for remote facilitation, collaboration, and team alignment — so you can choose the right stack for your team.',
    date: 'May 7, 2026',
    readTime: '10 min read',
    category: 'Roundup',
    tags: ['remote work', 'AI tools', 'team collaboration'],
  },
];

const BlogIndex = () => {
  return (
    <div className="min-h-screen bg-white">
      <PageHead
        title="Blog — AI Workshop Facilitation Insights & Guides"
        description="Practical guides, tips, and insights on AI-powered workshop facilitation, remote team collaboration, and running better design sprints, retrospectives, and strategy sessions."
        canonical="https://aifacilitator.ai/blog"
        breadcrumbs={[{ name: 'Blog', item: 'https://aifacilitator.ai/blog' }]}
      />

      {/* ── Hero — matches homepage hero exactly ─────────────────────── */}
      <section className="relative pt-28 pb-16 md:pb-24 px-4 overflow-hidden">
        {/* Background gradient — identical to homepage */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50 pointer-events-none" />
        {/* Decorative orbs */}
        <div className="absolute top-10 right-[10%] w-72 h-72 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-[5%] w-96 h-96 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative container mx-auto max-w-5xl text-center">
          {/* Badge pill — matches homepage */}
          <span className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold tracking-wide border border-indigo-200">
            <BookOpen className="h-3.5 w-3.5" />
            Insights &amp; Guides
          </span>

          {/* Headline — same scale as homepage */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-[1.1] tracking-tight text-center">
            <span className="text-gray-900">The AIfacilitator</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
              Blog
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl lg:text-2xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed text-center px-2">
            Practical guides and insights on AI-powered workshop facilitation, remote collaboration, and running better team sessions.
          </p>
        </div>
      </section>

      {/* ── Articles — left-aligned content ──────────────────────────── */}
      <section className="py-16 md:py-24 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Latest Articles</h2>
          <div className="space-y-6">
            {posts.map(post => (
              <article
                key={post.slug}
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                    {post.category}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {post.readTime}
                  </span>
                  <span className="text-xs text-gray-400">{post.date}</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 hover:text-indigo-600 transition-colors">
                  <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="text-gray-500 leading-relaxed mb-5">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100"
                      >
                        <Tag className="h-3 w-3" /> {tag}
                      </span>
                    ))}
                  </div>
                  <Link to={`/blog/${post.slug}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold"
                    >
                      Read more <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA — matches homepage CTA exactly ───────────────────────── */}
      <section className="py-16 md:py-24 px-4 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 text-center">
            Ready to run better workshops?
          </h2>
          <p className="text-base md:text-lg text-indigo-200 mb-10 max-w-xl mx-auto text-center px-2">
            Start with AIfacilitator for free — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link to="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto text-base font-semibold px-10 py-6 bg-white text-indigo-700 hover:bg-indigo-50 border-0 shadow-xl shadow-indigo-900/30 transition-colors rounded-xl"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/blog" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto text-base font-semibold px-10 py-6 bg-transparent border-2 border-white/50 text-white hover:bg-white/10 hover:border-white/70 transition-colors rounded-xl"
              >
                Browse All Articles
              </Button>
            </Link>
          </div>
          {/* Trust signals — matches homepage */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-indigo-200">
            {['No credit card required', 'Free plan available', 'Cancel anytime'].map(item => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-indigo-300" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogIndex;
