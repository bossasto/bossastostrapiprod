'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const _ = require('lodash');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const formatError = error => [
    { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

module.exports = {
  /**
   * Retrieve records.
   *
   * @return {Array}
   */

  async find(ctx) {
    let entities;
    if (ctx.query._q) {
      entities = await strapi.services.company.search(ctx.query);
    } else {
      entities = await strapi.services.company.find(ctx.query);
    }

    if (ctx.state.user.role.name === 'Worker' && entities && entities.length > 0) {
      entities = entities.map(entity => _.omit(entity, ['users', 'favorites', 'files', 'applications']));
    }
    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.company }));
  },

    /**
   * Retrieve a record.
   *
   * @return {Object}
   */

  async findOne(ctx) {
    const { id } = ctx.params;

    if (ctx.state.user.role.name === 'Company' && ctx.state.user.company !== parseInt(id, 10)) {
        return ctx.badRequest(
            null,
            formatError({
              id: 'Auth.form.error.invalid.id',
              message: 'Invalid id.',
              field: ['id'],
            })
          );
    }

    let entity = await strapi.services.company.findOne(
      { id },
      ['favorites.user', 'favorites.image', 'favorites.files', 'image', 'files', 'applications', 'users', 'companyCategory', "industries", "industy_occupations", "emailSubFor"]
    );

    if (ctx.state.user.role.name === 'Worker' && entity) {
      entity = _.omit(entity, ['users', 'favorites', 'files', 'applications']);
    }
    return sanitizeEntity(entity, { model: strapi.models.company });
  },

  /**
   * Update a record.
   *
   * @return {Object}
   */

   async update(ctx) {
    const { id } = ctx.params;

    if (ctx.state.user.role.name === 'Company' && ctx.state.user.company !== parseInt(id, 10)) {
        return ctx.badRequest(
            null,
            formatError({
              id: 'Auth.form.error.invalid.id',
              message: 'Invalid id.',
              field: ['id'],
            })
          );
    }

    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.company.update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.services.company.update({ id }, ctx.request.body);
    }

    return sanitizeEntity(entity, { model: strapi.models.company });
  },


};
