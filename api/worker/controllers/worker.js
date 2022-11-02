"use strict";

const { parseMultipartData, sanitizeEntity } = require("strapi-utils");
const _ = require("lodash");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const formatError = (error) => [
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
      let entities;
      let industry = [],
        locale = "en",
        industy_occupation = [];
      if (ctx.state && ctx.state.user.role.name === "Company") {
        let companyData = await strapi.services.company.findOne({
          id: ctx.state.user.company,
        });
        industry = companyData && companyData.industries.map((item) => item.id);
        industy_occupation =
          companyData && companyData.industy_occupations.map((item) => item.id);
        locale =
          (companyData &&
            companyData.industries &&
            companyData.industries.length &&
            companyData.industries[0].locale) ||
          "en";
      } else if (ctx.state && ctx.state.user.role.name === "Worker") {
        let userData = await strapi.services.worker.findOne({
          id: ctx.state.user.worker,
        });
        industry = userData && userData.industries.map((item) => item.id);
        industy_occupation =
          userData && userData.industy_occupations.map((item) => item.id);
        locale =
          (userData &&
            userData.industries &&
            userData.industries.length &&
            userData.industries[0].locale) ||
          "en";
      }
      let industriesList = await strapi.services.industries.find({
        id: industry,
        _locale: locale,
      });
      let indOcpList = await strapi.services["industy-occupations"].find({
        id: industy_occupation,
        _locale: locale,
      });
      industriesList =
        industriesList && industriesList.length
          ? industriesList.map((item) => {
              industry = [
                ...industry,
                ...item.localizations.map((item) => item.id),
              ];
            })
          : industriesList;
      indOcpList =
        (indOcpList &&
          indOcpList.length &&
          indOcpList.map((item) => {
            industy_occupation = [
              ...industy_occupation,
              ...item.localizations.map((item) => item.id),
            ];
          })) ||
        indOcpList;
      ctx.query = {
        ...ctx.query,
        industries_in: industry,
        industy_occupations_in: industy_occupation,
        isActive: true,
      };

      if (ctx.query._q) {
        entities = await strapi.services.worker.search(ctx.query);
      } else {
        entities = await strapi.services.worker.find(ctx.query);
      }

      if (ctx.state.user.role.name === "Company" && entities) {
        entities = entities.map((entity) => ({
          ..._.omit(entity, ["user", "applications", "favorites"]),
          name: entity.user ? entity.user.name : "",
          email: entity.user ? entity.user.email : "",
        }));
      }
      return entities.map((entity) =>
        sanitizeEntity(entity, { model: strapi.models.worker })
      );
    } catch (error) {
      console.log("ERROR WHILE FETCHING WORKERS", error);
    }
  },

  /**
   * Retrieve a record.
   *
   * @return {Object}
   */

  async findOne(ctx) {
    let { id } = ctx.params;

    console.log(ctx.state.user);

    if (ctx.state.user.role.name === "Worker") {
      id = ctx.state.user.worker;
    }

    let entity = await strapi.services.worker.findOne({ id });
    if (ctx.state.user.role.name === "Company" && entity) {
      entity = {
        ..._.omit(entity, ["user", "applications", "favorites"]),
        name: entity.user ? entity.user.name : "",
        email: entity.user ? entity.user.email : "",
      };
    }
    return sanitizeEntity(entity, { model: strapi.models.worker });
  },

  /**
   * Update a record.
   *
   * @return {Object}
   */

  async update(ctx) {
    const { id } = ctx.params;

    if (
      ctx.state.user.role.name === "Worker" &&
      ctx.state.user.worker !== parseInt(id, 10)
    ) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.form.error.invalid.id",
          message: "Invalid id.",
          field: ["id"],
        })
      );
    }

    let entity;
    if (ctx.is("multipart")) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.worker.update({ id }, data, {
        files,
      });
    } else {
      entity = await strapi.services.worker.update({ id }, ctx.request.body);
    }

    return sanitizeEntity(entity, { model: strapi.models.worker });
  },
};
