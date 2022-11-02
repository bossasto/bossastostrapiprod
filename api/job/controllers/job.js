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
const emailTemplateEn = {
  subject: 'Bossasto Notification',
  text: `The user  <%= user.name %> that you saved as a favorite in your Bossasto account has now become available again for job offers.`,
  html: `<h1>Good News!</h1>
    <p> The user  <%= user.name %> that you saved as a favorite in your Bossasto account has now become available again for job offers.<p>`,
};
const emailTemplateDe = {
  subject: 'Bossasto Notification',
  text: ` Der Benutzer <%= user.name %> den Sie als Favorit in Ihrem Bossasto-Konto gespeichert haben, ist jetzt wieder für Stellenangebote verfügbar.`,
  html: `<h1>Gute Nachrichten!</h1>
    <p> Der Benutzer <%= user.name %> den Sie als Favorit in Ihrem Bossasto-Konto gespeichert haben, ist jetzt wieder für Stellenangebote verfügbar.<p>`,
};
const emailTemplateIt = {
  subject: 'Bossasto Notification',
  text: `L'utente <%= user.name %> che avete salvato tra i preferiti nel vostro account Bossasto è ora nuovamente disponibile per le offerte di lavoro.`,
  html: `<h1>Buone notizie!</h1>
    <p> L'utente <%= user.name %> che avete salvato tra i preferiti nel vostro account Bossasto è ora nuovamente disponibile per le offerte di lavoro.<p>`,
};
const emailTemplateFr = {
  subject: 'Bossasto Notification',
  text: `L'utente <%= user.name %> che avete salvato tra i preferiti nel vostro account Bossasto è ora nuovamente disponibile per le offerte di lavoro.`,
  html: `<h1>Bonne nouvelle!</h1>
    <p>L'utilisateur <%= user.name %> que vous avez enregistré comme favori dans votre compte Bossasto est à nouveau disponible pour des offres d'emploi.<p>`,
};
module.exports = {
  /**
   * Retrieve records.
   *
   * @return {Array}
   */

  async find(ctx) {
    let entities;
    let industry = [],
      locale = "en",
      industy_occupation = [];
    if (ctx.state && ctx.state.user) {
      if (ctx.state && ctx.state.user.role.name === "Company") {
        ctx.query.company = ctx.state.user.company;
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
      ctx.query = { ...ctx.query, industry_in: industry, industy_occupation_in: industy_occupation };
    }
    if (ctx.query._q) {
      entities = await strapi.services.job.search(ctx.query, [
        "jobTypes",
        "company.image",
        "company.files",
        "applications",
        "applications.worker",
        "applications.worker.user",
        "applications.worker.education",
        "applications.worker.image",
      ]);
    } else {
      entities = await strapi.services.job.find(ctx.query, [
        "jobTypes",
        "company.image",
        "company.files",
        "applications",
        "applications.worker",
        "applications.worker.user",
        "applications.worker.education",
        "applications.worker.image",
      ]);
    }

    if (ctx.state && ctx.state.user && ctx.state.user.role.name === "Worker" && entities) {
      entities = entities.map((entity) => ({
        ..._.omit(entity, ["applications"]),
      }));
    }
    return entities.map((entity) =>
      sanitizeEntity(entity, { model: strapi.models.job })
    );
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

    if (ctx.state.user.role.name === "Company") {
      queryBy.company = ctx.state.user.company;
    }

    let entity = await strapi.services.job.findOne(queryBy);
    if (ctx.state.user.role.name === "Worker" && entity) {
      entity = _.omit(entity, ["applications"]);
    }
    return sanitizeEntity(entity, { model: strapi.models.job });
  },

  /**
   * Count records.
   *
   * @return {Number}
   */

  count(ctx) {
    if (ctx.state && ctx.state.user && ctx.state.user.role.name === "Company") {
      ctx.query.company = ctx.state.user.company;
    }

    if (ctx.query._q) {
      return strapi.services.job.countSearch(ctx.query);
    }
    return strapi.services.job.count(ctx.query);
  },

  /**
   * Create a record.
   *
   * @return {Object}
   */

  async create(ctx) {
    let entity;
    if (ctx.is("multipart")) {
      let { data, files } = parseMultipartData(ctx);

      data.company = ctx.state.user.company;
      data.applications = [];

      entity = await strapi.services.job.create(data, { files });
    } else {
      ctx.request.body.company = ctx.state.user.company;
      ctx.request.body.applications = [];

      entity = await strapi.services.job.create(ctx.request.body);
    }
    return sanitizeEntity(entity, { model: strapi.models.job });
  },

  /**
   * Update a record.
   *
   * @return {Object}
   */

  async update(ctx) {
    const { id } = ctx.params;

    let entityBefore;

    try {
      entityBefore = await strapi.query("job").findOne({ id });
    } catch (err) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.form.error.invalid.id",
          message: "Invalid id.",
          field: ["id"],
        })
      );
    }

    if (ctx.state.user.company !== entityBefore.company.id) {
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
      data.company = ctx.state.user.company;
      delete data.applications;
      entity = await strapi.services.job.update({ id }, data, {
        files,
      });
    } else {
      console.log("here is edit before,,,,,", entityBefore);
      if (ctx.request.body.status === 'finished') {
        // console.log("in if condition===")
        let workerList = entityBefore && entityBefore.applications && entityBefore.applications.length && entityBefore.applications.map(item => item.status === 'accepted' && item.worker) || [];
        // console.log("worker list", workerList)
        workerList = workerList.length && workerList.filter(Boolean)
        // console.log("worker list after=====", workerList)
        if (workerList && workerList.length) {
          // console.log("************************************")
          // console.log("___________fetching companies")
          let companiesList = await strapi.services.company.find({ favorites_in: workerList, isEmailSubscription: true });
          // console.log("companies list", companiesList[0].favorites);
          if (companiesList && companiesList.length) {
            // console.log("In condition====")
            let x = 0
            while (x < companiesList.length) {
              let workersIds = companiesList[x].favorites.map(item => item.id) || [];
              // console.log("workersids====", workersIds)
              let workersInfo = entityBefore.applications.map(item => workersIds.includes(item.worker) && { name: item.internalName && item.internalName.split('/')[0] }) || [];
            //  console.log("here is worker after filter", workersInfo)
              workersInfo = workersInfo.length && workersInfo.filter(Boolean)
              for (let index = 0; index < workersInfo.length; index++) {
                // console.log("Workers Info for mail",workersInfo[index] )
                this.sendNewSignUpNotification(workersInfo[index], companiesList[x], ctx.request.body.locale);
              }
              x++;
            }
          }
        }
      }
      ctx.request.body.company = ctx.state.user.company;
      delete ctx.request.body.applications;
      entity = await strapi.services.job.update({ id }, ctx.request.body);
    }

    return sanitizeEntity(entity, { model: strapi.models.job });
  },

  /**
   * 
   * @param {} user 
   * @param {*} company\
   * send email to company when a job is completed by thier fav worker. 
   */

  async sendNewSignUpNotification(user, company, lang) {
    try {
      await strapi.plugins['email'].services.email.sendTemplatedEmail(
        {
          to: company.contactEmail,
          // from: is not specified, the defaultFrom is used.
        },
        lang === 'en' ? emailTemplateEn : lang === 'de' ? emailTemplateDe : lang === 'fr' ? emailTemplateFr : lang === 'it' ? emailTemplateIt : emailTemplateEn,
        {
          user: _.pick(user, ['name']),
        })
    } catch (error) {
      console.log("ERROR while calling sendNewSignUpNotification ==>>>", error)
    }
  },

  /**
   * Delete a record.
   *
   * @return {Object}
   */

  async delete(ctx) {
    const { id } = ctx.params;
    const entityBefore = await strapi.query("job").findOne({ id });

    if (entityBefore && ctx.state.user.company !== entityBefore.company.id) {
      return ctx.badRequest(
        null,
        formatError({
          id: "Auth.form.error.invalid.id",
          message: "Invalid id.",
          field: ["id"],
        })
      );
    }

    const entity = await strapi.services.job.delete({ id });
    return sanitizeEntity(entity, { model: strapi.models.job });
  },
};
