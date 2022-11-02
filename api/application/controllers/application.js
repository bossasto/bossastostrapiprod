'use strict';

const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const _ = require('lodash');
const moment = require('moment');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const sanitizeUser = user =>
  sanitizeEntity(user, {
    model: strapi.query('user', 'users-permissions').model,
  });

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
        try {
            
        
        let entities,expireIds=[], expiryTime = moment().subtract(30,'d').unix();

        if (ctx.state && ctx.state.user.role.name === 'Company') {
            ctx.query.company = ctx.state.user.company;
        } else if (ctx.state && ctx.state.user.role.name === 'Worker') {
            ctx.query.worker = ctx.state.user.worker;
        } else {
            return [];
        }

        if (ctx.query._q) {
            entities = await strapi.services.application.search(ctx.query);
        } else {
            entities = await strapi.services.application.find(ctx.query);
        }

        let users = [];
        if (entities && entities.length > 0) {
          const userIds = [];
          entities.forEach(entity => {
            if (entity && entity.worker && entity.worker.user && !userIds.includes(entity.worker.user)) {
              userIds.push(entity.worker.user);
            }
          });
          users = await Promise.all(userIds.map(userId => strapi.query('user', 'users-permissions').findOne({id: userId, lastLogin_gte: expiryTime})));
          console.log(expiryTime,'expiry timee==',users);
        //   await strapi.services.worker.update({ user: 1}, {isActive : false});
          users = users.map(user => _.pick(user, ['id', 'name', 'email',]));
        }

        if (ctx.state.user.role.name === 'Worker') {
            return entities.map(entity => ({
                ...entity,
                company: _.omit(entity.company, ['files']),
            }));
        }
        let updatedList = entities
          .map((entity) =>
            sanitizeEntity(entity, { model: strapi.models.application })
          )
          .map((entity) => {
            if (
              entity.worker &&
              entity.worker.user &&
            //   entity.worker.isActive !==false &&
              users.some((user) => entity.worker.user === user.id )
            )
              return {
                ...entity,
                worker: {
                  ...entity.worker,
                  user:
                    entity.worker && entity.worker.user
                      ? users.find((user) => entity.worker.user === user.id) ||
                        entity.worker.user
                      : null,
                },
              };
              else { 
                expireIds = [...expireIds,entity.worker.user ]
              }
          });
          expireIds = expireIds.filter(Boolean)
          expireIds && expireIds.forEach(item=>strapi.services.worker.update({ user: item, isActive: true}, {isActive : false}))
        return updatedList.filter(Boolean)
    } catch (error) {
           console.log("ERROR WHILE FETCHING APPLICATIONS====>", error) 
    }
    },

    /**
     * Retrieve a record.
     *
     * @return {Object}
     */

    async findOne(ctx) {
        const { id } = ctx.params;

        const queryBy = {
            id,
        };

        if (ctx.state.user.role.name === 'Company') {
            queryBy.company = ctx.state.user.company;
        } else if (ctx.state.user.role.name === 'Worker') {
            queryBy.worker = ctx.state.user.worker;
        } else {
            return null;
        }

        const entity = await strapi.services.application.findOne(queryBy);
        if (ctx.state.user.role.name === 'Worker') {
            entity.company = _.omit(entity.company, ['files']);
        }
        return sanitizeEntity(entity, { model: strapi.models.application });
    },

    /**
     * Create a record.
     *
     * @return {Object}
     */

    async create(ctx) {
        let entity;
        if (ctx.is('multipart')) {
            const { data, files } = parseMultipartData(ctx);
            let job;

            if (!data.job) {
                return ctx.badRequest(
                    null,
                    formatError({
                      id: 'Auth.form.error.invalid.id',
                      message: 'Missing job',
                      field: ['id'],
                    })
                  );
            }
            try {
                job = await strapi.query('job').findOne({ id: data.job });
            } catch(error) {
                return ctx.badRequest(
                    null,
                    formatError({
                      id: 'Auth.form.error.invalid.id',
                      message: 'Invalid job id',
                      field: ['id'],
                    })
                  );
            }

            data.worker = ctx.state.user.worker;
            data.company = job.company.id;
            data.status = 'pending';
            data.internalName = `${ctx.state.user.name}/${job.company.companyName}/${job.title}`;
            entity = await strapi.services.application.create(data, { files });
        } else {
            let job;

            if (!ctx.request.body.job) {
                return ctx.badRequest(
                    null,
                    formatError({
                      id: 'Auth.form.error.invalid.id',
                      message: 'Missing job',
                      field: ['id'],
                    })
                  );
            }
            try {
                job = await strapi.query('job').findOne({ id: ctx.request.body.job });
            } catch(error) {
                return ctx.badRequest(
                    null,
                    formatError({
                      id: 'Auth.form.error.invalid.id',
                      message: 'Invalid job id',
                      field: ['id'],
                    })
                  );
            }

            ctx.request.body.worker = ctx.state.user.worker;
            ctx.request.body.company = job.company.id;
            ctx.request.body.status = 'pending';
            ctx.request.body.internalName = `${ctx.state.user.name}/${job.company.companyName}/${job.title}`;
            entity = await strapi.services.application.create(ctx.request.body);
        }
        entity.company = _.omit(entity.company, ['files']);
        return sanitizeEntity(entity, { model: strapi.models.application });
    },

    /**
     * Update a record.
     *
     * @return {Object}
     */

    async update(ctx) {
        const { id } = ctx.params;

        let entity;
        if (ctx.is('multipart')) {
            let { data, files } = parseMultipartData(ctx);
            data = _.pick(data, ['status']);
            entity = await strapi.services.application.update({ id }, data, {
            files,
            });
        } else {
            let body = _.pick(ctx.request.body, ['status']);
            entity = await strapi.services.application.update({ id }, body);
        }

        return sanitizeEntity(entity, { model: strapi.models.application });
    },

    /**
     * Delete a record.
     *
     * @return {Object}
     */

    async delete(ctx) {
        const { id } = ctx.params;

        const entity = await strapi.services.application.delete({
            id,
            worker: ctx.state.user.worker,
         });

        entity.company = _.omit(entity.company, ['files']);
        return sanitizeEntity(entity, { model: strapi.models.application });
    },

};
