import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Layout } from '../src/components/layout';

describe('Layout', () => {
  it('renders its regions as real landmarks', () => {
    render(
      <Layout
        header={<span>Product</span>}
        sidebar={<span>Sections</span>}
        footer={<span>Legal</span>}
      >
        <h1>Dashboard</h1>
      </Layout>,
    );

    expect(screen.getByRole('banner')).toHaveTextContent('Product');
    expect(screen.getByRole('complementary')).toHaveTextContent('Sections');
    expect(screen.getByRole('main')).toHaveTextContent('Dashboard');
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Legal');
  });

  it('omits a region entirely when it is not given, rather than leaving an empty landmark', () => {
    render(<Layout>{<h1>Dashboard</h1>}</Layout>);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('forwards className to the outer element', () => {
    const { container } = render(<Layout className="h-screen">content</Layout>);
    expect((container.firstElementChild as HTMLElement).className).toContain('h-screen');
  });
});
