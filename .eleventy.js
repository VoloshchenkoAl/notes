const { DateTime, Settings } = require('luxon');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const EleventyVitePlugin = require('@11ty/eleventy-plugin-vite');

module.exports = function (eleventyConfig) {
  Settings.defaultLocale = 'uk-UA';

  eleventyConfig.addPlugin(EleventyVitePlugin);

  eleventyConfig.addPlugin(syntaxHighlight);

  eleventyConfig.addFilter('readableDate', function (dateObj) {
    return DateTime.fromJSDate(dateObj).toFormat('dd LLLL yyyy');
  });

  eleventyConfig.addFilter('htmlDateString', function (dateObj) {
    return DateTime.fromJSDate(dateObj).toFormat('yyyy-LL-dd');
  });

  eleventyConfig.addFilter('reversed', function (tags) {
    return tags.reverse();
  });

  eleventyConfig.addFilter('postTags', function filterTagList(tags) {
    return (tags || []).filter((tag) => !['post'].includes(tag));
  });

  eleventyConfig.addPassthroughCopy('./src/assets/css');
  eleventyConfig.addPassthroughCopy('./src/assets/images');

  return {
    dir: {
      input: 'src',
      output: 'output',
      layouts: '_layouts',
    },
  };
};
