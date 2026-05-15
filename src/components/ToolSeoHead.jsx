import React from 'react';
import { useLocation } from 'react-router-dom';
import SEO from './SEO';
import { getSeoMetadata } from '../constants/seoMetadata';
import { getVariantMeta } from '../constants/seoVariants';
import { buildToolSchemas } from '../constants/seoSchemas';
import { getToolContent } from '../constants/toolContent';

export default function ToolSeoHead({ toolKey }) {
  const location = useLocation();
  const baseMeta = getSeoMetadata(toolKey);
  const variantMeta = getVariantMeta(location.pathname);
  const toolContent = getToolContent(toolKey);

  const meta = variantMeta
    ? { ...baseMeta, ...variantMeta }
    : baseMeta;

  const schemas = buildToolSchemas({
    toolName: toolContent?.name || baseMeta.title,
    url: baseMeta.url,
    description: baseMeta.description,
    faqs: toolContent?.faqs || [],
  });

  return (
    <SEO
      title={meta.title}
      description={meta.description}
      keywords={meta.keywords}
      url={meta.url}
      canonicalUrl={baseMeta.url}
      schema={schemas}
    />
  );
}
