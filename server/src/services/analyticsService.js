// server/src/services/analyticsService.js
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class AnalyticsService {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.analyticsFile = path.join(this.dataDir, 'analytics.json');
    this.aggregatesFile = path.join(this.dataDir, 'analytics_aggregates.json');
    this.initialized = false;
    
    this.writeLock = false;
    this.writeQueue = [];
  }

  async init() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      
      try {
        const data = await fs.readFile(this.analyticsFile, 'utf8');
        JSON.parse(data);
      } catch {
        await fs.writeFile(this.analyticsFile, JSON.stringify([], null, 2));
        logger.info('Created new analytics.json file');
      }

      try {
        const data = await fs.readFile(this.aggregatesFile, 'utf8');
        JSON.parse(data);
      } catch {
        await fs.writeFile(this.aggregatesFile, JSON.stringify({
          hourly: {},
          daily: {},
          endpoints: {}
        }, null, 2));
        logger.info('Created new analytics_aggregates.json file');
      }
      
      this.initialized = true;
    } catch (error) {
      logger.error('Analytics init error:', error);
      throw error;
    }
  }

  async safeReadJSON(filepath, defaultValue) {
    try {
      const data = await fs.readFile(filepath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.warn(`Failed to read ${filepath}, using default value`, error.message);
      return defaultValue;
    }
  }

  async safeWriteJSON(filepath, data) {
    if (this.writeLock) {
      return new Promise((resolve, reject) => {
        this.writeQueue.push({ filepath, data, resolve, reject });
      });
    }

    this.writeLock = true;

    const tempFile = filepath + '.tmp';
    try {
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');

      try {
        await fs.rename(tempFile, filepath);
      } catch (err) {
        logger.warn(`rename failed (${err.code}). Attempting Windows-friendly fallback.`, { errCode: err.code });

        if (err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'EBUSY') {
          try {
            await fs.unlink(filepath);
            logger.info(`Deleted target file ${filepath} and retrying rename.`);
            await fs.rename(tempFile, filepath);
          } catch (err2) {
            logger.warn('Retry rename after unlink failed:', err2.code || err2.message);
            try {
              await fs.copyFile(tempFile, filepath);
              await fs.unlink(tempFile).catch(()=>{});
              logger.info(`Copied temp to target as fallback for ${filepath}.`);
            } catch (finalErr) {
              logger.error(`Final fallback failed for ${filepath}:`, finalErr);
              try { await fs.unlink(tempFile); } catch(e){}
              throw finalErr;
            }
          }
        } else {
          throw err;
        }
      }

    } catch (error) {
      logger.error(`Failed to write ${filepath}:`, error);
      throw error;
    } finally {
      this.writeLock = false;

      if (this.writeQueue.length > 0) {
        const next = this.writeQueue.shift();
        this.safeWriteJSON(next.filepath, next.data)
          .then(next.resolve)
          .catch(next.reject);
      }
    }
  }

  async record(entry) {
    await this.init();
    
    try {
      const data = await this.safeReadJSON(this.analyticsFile, []);
      
      data.push(entry);
      
      const trimmedData = data.slice(-10000);
      
      await this.safeWriteJSON(this.analyticsFile, trimmedData);
      
      this.updateAggregates(entry).catch(err => {
        logger.error('Failed to update aggregates:', err);
      });
      
    } catch (error) {
      logger.error('Analytics record error:', error);
    }
  }

  async updateAggregates(entry) {
    try {
      const aggregates = await this.safeReadJSON(this.aggregatesFile, {
        hourly: {},
        daily: {},
        endpoints: {}
      });
      
      const date = new Date(entry.timestamp);
      const hourKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}`;
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!aggregates.hourly[hourKey]) {
        aggregates.hourly[hourKey] = {
          requests: 0,
          errors: 0,
          totalDuration: 0,
          avgDuration: 0
        };
      }
      
      aggregates.hourly[hourKey].requests++;
      if (entry.status >= 400) aggregates.hourly[hourKey].errors++;
      aggregates.hourly[hourKey].totalDuration += entry.duration;
      aggregates.hourly[hourKey].avgDuration = 
        aggregates.hourly[hourKey].totalDuration / aggregates.hourly[hourKey].requests;
      
      if (!aggregates.daily[dayKey]) {
        aggregates.daily[dayKey] = {
          requests: 0,
          errors: 0,
          totalDuration: 0,
          avgDuration: 0
        };
      }
      
      aggregates.daily[dayKey].requests++;
      if (entry.status >= 400) aggregates.daily[dayKey].errors++;
      aggregates.daily[dayKey].totalDuration += entry.duration;
      aggregates.daily[dayKey].avgDuration = 
        aggregates.daily[dayKey].totalDuration / aggregates.daily[dayKey].requests;
      
      const endpoint = entry.path.split('?')[0];
      if (!aggregates.endpoints[endpoint]) {
        aggregates.endpoints[endpoint] = {
          requests: 0,
          errors: 0,
          totalDuration: 0,
          avgDuration: 0
        };
      }
      
      aggregates.endpoints[endpoint].requests++;
      if (entry.status >= 400) aggregates.endpoints[endpoint].errors++;
      aggregates.endpoints[endpoint].totalDuration += entry.duration;
      aggregates.endpoints[endpoint].avgDuration = 
        aggregates.endpoints[endpoint].totalDuration / aggregates.endpoints[endpoint].requests;
      
      const recentHours = Object.keys(aggregates.hourly).sort().slice(-168);
      aggregates.hourly = recentHours.reduce((acc, key) => {
        acc[key] = aggregates.hourly[key];
        return acc;
      }, {});
      
      const recentDays = Object.keys(aggregates.daily).sort().slice(-30);
      aggregates.daily = recentDays.reduce((acc, key) => {
        acc[key] = aggregates.daily[key];
        return acc;
      }, {});
      
      await this.safeWriteJSON(this.aggregatesFile, aggregates);
      
    } catch (error) {
      logger.error('Update aggregates error:', error);
    }
  }

  async getOverview(params = {}) {
    await this.init();
    
    try {
      const data = await this.safeReadJSON(this.analyticsFile, []);
      const aggregates = await this.safeReadJSON(this.aggregatesFile, {
        hourly: {},
        daily: {},
        endpoints: {}
      });
      
      const last24h = data.filter(entry => {
        const age = Date.now() - new Date(entry.timestamp).getTime();
        return age <= 24 * 60 * 60 * 1000;
      });
      
      const totalRequests = last24h.length;
      const errorRequests = last24h.filter(e => e.status >= 400).length;
      const avgDuration = last24h.length > 0
        ? last24h.reduce((sum, e) => sum + e.duration, 0) / last24h.length
        : 0;
      
      const errorRate = totalRequests > 0 ? (errorRequests / totalRequests * 100).toFixed(2) : 0;
      
      return {
        period: '24h',
        totalRequests,
        errorRequests,
        errorRate: parseFloat(errorRate),
        avgDuration: Math.round(avgDuration),
        uniqueUsers: new Set(last24h.filter(e => e.userId).map(e => e.userId)).size,
        topEndpoints: this.getTopEndpoints(aggregates.endpoints, 5)
      };
      
    } catch (error) {
      logger.error('Get overview error:', error);
      return null;
    }
  }

  async getTimeseries(metric = 'requests', range = '24h') {
    await this.init();
    
    try {
      const aggregates = await this.safeReadJSON(this.aggregatesFile, {
        hourly: {},
        daily: {},
        endpoints: {}
      });
      
      let data;
      if (range === '24h') {
        data = Object.entries(aggregates.hourly)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-24)
          .map(([key, value]) => ({
            timestamp: key,
            value: value[metric] || value.requests
          }));
      } else {
        data = Object.entries(aggregates.daily)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-30)
          .map(([key, value]) => ({
            timestamp: key,
            value: value[metric] || value.requests
          }));
      }
      
      const trend = this.detectTrends(data.map(d => d.value));
      
      return {
        metric,
        range,
        data,
        trend
      };
      
    } catch (error) {
      logger.error('Get timeseries error:', error);
      return null;
    }
  }

  detectTrends(series) {
    if (series.length < 3) {
      return { direction: 'stable', confidence: 'low', movingAverage: series };
    }
    
    const ma = [];
    for (let i = 0; i < series.length; i++) {
      if (i < 2) {
        ma.push(series[i]);
      } else {
        ma.push((series[i] + series[i - 1] + series[i - 2]) / 3);
      }
    }
    
    const recentWindow = Math.min(6, series.length);
    const recent = series.slice(-recentWindow);
    const firstHalf = recent.slice(0, Math.floor(recentWindow / 2));
    const secondHalf = recent.slice(Math.floor(recentWindow / 2));
    
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const percentChange = ((avgSecond - avgFirst) / (avgFirst || 1)) * 100;
    
    let direction = 'stable';
    let confidence = 'low';
    
    if (Math.abs(percentChange) > 20) {
      confidence = 'high';
      direction = percentChange > 0 ? 'rising' : 'falling';
    } else if (Math.abs(percentChange) > 10) {
      confidence = 'medium';
      direction = percentChange > 0 ? 'rising' : 'falling';
    }
    
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    const variance = series.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / series.length;
    const stdDev = Math.sqrt(variance);
    const anomalies = series.map((val, idx) => ({
      index: idx,
      value: val,
      isAnomaly: Math.abs(val - mean) > 2 * stdDev
    })).filter(a => a.isAnomaly);
    
    return {
      direction,
      confidence,
      percentChange: parseFloat(percentChange.toFixed(2)),
      movingAverage: ma,
      anomalies: anomalies.map(a => a.index)
    };
  }

  getTopEndpoints(endpoints, limit = 10) {
    return Object.entries(endpoints)
      .sort((a, b) => b[1].requests - a[1].requests)
      .slice(0, limit)
      .map(([path, stats]) => ({
        path,
        requests: stats.requests,
        errors: stats.errors,
        avgDuration: Math.round(stats.avgDuration),
        errorRate: stats.requests > 0 
          ? parseFloat((stats.errors / stats.requests * 100).toFixed(2))
          : 0
      }));
  }
}

module.exports = new AnalyticsService();