<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap | OM PDF</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            color: #333;
            margin: 0;
            padding: 40px;
            background-color: #f9fafb;
          }
          .header {
            margin-bottom: 30px;
            background: #fff;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          h1 {
            margin: 0 0 10px 0;
            color: #111827;
            font-size: 24px;
          }
          p {
            margin: 0;
            color: #6b7280;
          }
          a {
            color: #2563EB;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          table {
            width: 100%;
            background: #fff;
            border-collapse: collapse;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          th {
            text-align: left;
            background-color: #f3f4f6;
            color: #374151;
            font-weight: 600;
            padding: 16px;
            border-bottom: 2px solid #e5e7eb;
          }
          td {
            padding: 16px;
            border-bottom: 1px solid #e5e7eb;
            color: #4b5563;
          }
          tr:last-child td {
            border-bottom: none;
          }
          tr:hover {
            background-color: #f9fafb;
          }
          .url {
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>XML Sitemap</h1>
          <p>This is the XML Sitemap for <strong><a href="https://om-pdf.pages.dev">OM PDF</a></strong>. It is designed to be easily digested by search engines like Google and Bing.</p>
          <p style="margin-top: 8px;">Total URLs: <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong></p>
        </div>
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>Priority</th>
              <th>Change Frequency</th>
              <th>Last Modified</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="sitemap:urlset/sitemap:url">
              <tr>
                <td class="url"><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                <td><xsl:value-of select="sitemap:priority"/></td>
                <td><xsl:value-of select="sitemap:changefreq"/></td>
                <td><xsl:value-of select="sitemap:lastmod"/></td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
