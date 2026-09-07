import app from '../server/src/app.js';

export default (req: any, res: any) => {
  return app(req, res);
};
