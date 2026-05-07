/**
 * Blog Index Page
 * SEO target: "AI workshop facilitation blog", "workshop facilitation tips"
 */
import React from 'react';
import { Link } from 'react-router-dom';
import PageHead from '@/components/PageHead';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, Tag } from 'lucide-react';

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
    excerpt: 'AI is transforming how teams run workshops. This guide explains exactly how AI facilitation works, when to use it, and how to get the best results from your first AI-facilitated session.',
    date: 'May 7, 2026',
    readTime: '8 min read',
    category: 'Guide',
    tags: ['AI facilitation', 'workshop tools', 'remote teams'],
  },
  {
    slug: 'ai-tools-for-remote-teams',
    title: 'The 7 Best AI Tools for Remote Team Workshops in 2026',
    excerpt: 'Remote teams face unique challenges when running workshops. We reviewed the top AI-powered tools for remote facilitation, collaboration, and team alignment — so you can choose the right stack for your team.',
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

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 bg-gradient-to-br from-gray-50 via-white to-indigo-50">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            The AIfacilitator Blog
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Practical guides and insights on AI-powered workshop facilitation, remote collaboration, and running better team sessions.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="space-y-8">
            {posts.map(post => (
              <article key={post.slug} className="border border-gray-100 rounded-2xl p-8 hover:border-indigo-200 hover:shadow-sm transition-all">
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
                      <span key={tag} className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                        <Tag className="h-3 w-3" /> {tag}
                      </span>
                    ))}
                  </div>
                  <Link to={`/blog/${post.slug}`}>
                    <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold">
                      Read more <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to run better workshops?</h2>
          <p className="text-gray-500 mb-6">Start with AIfacilitator for free — no credit card required.</p>
          <Link to="/signup">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-base font-semibold px-8 py-5 rounded-xl">
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default BlogIndex;
