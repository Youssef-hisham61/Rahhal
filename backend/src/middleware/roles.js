function ownerOnly(req, res, next) {
  if (req.user.role !== 'owner') {
    return res.status(403).json({
      message_ar: 'غير مصرح لك بهذا الإجراء',
      message_en: 'Forbidden — owner only',
    });
  }
  next();
}

function adminOrAbove(req, res, next) {
  if (!['owner', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      message_ar: 'غير مصرح لك بهذا الإجراء',
      message_en: 'Forbidden — admin or above required',
    });
  }
  next();
}

function supervisorOrAbove(req, res, next) {
  if (!['owner', 'admin', 'supervisor'].includes(req.user.role)) {
    return res.status(403).json({
      message_ar: 'غير مصرح لك بهذا الإجراء',
      message_en: 'Forbidden — supervisor or above required',
    });
  }
  next();
}

function workerOrAbove(req, res, next) {
  if (req.user.role === 'viewer') {
    return res.status(403).json({
      message_ar: 'غير مصرح لك بهذا الإجراء',
      message_en: 'Forbidden — viewer cannot perform this action',
    });
  }
  next();
}

function sameStoreOrAbove(req, res, next) {
  if (['owner', 'admin'].includes(req.user.role)) return next();

  const requestedStoreId = req.params.store_id || req.body.store_id || req.query.store_id;
  if (requestedStoreId && requestedStoreId !== req.user.store_id) {
    return res.status(403).json({
      message_ar: 'غير مصرح لك بالوصول إلى هذا الفرع',
      message_en: 'Forbidden — access restricted to your own store',
    });
  }
  next();
}

module.exports = { ownerOnly, adminOrAbove, supervisorOrAbove, workerOrAbove, sameStoreOrAbove };
