import { Router } from 'express';
import { getRealtimeQuote, getBatchRealtimeQuotes } from '../services/realtime-data.service';

const router = Router();

/**
 * GET /api/realtime/quote
 * 获取单个股票的实时报价
 */
router.get('/quote', async (req, res) => {
  try {
    const { symbol, market } = req.query;

    if (!symbol || !market) {
      return res.status(400).json({
        error: 'Missing required parameters: symbol and market',
      });
    }

    const quote = await getRealtimeQuote(
      symbol as string,
      market as string
    );

    if (!quote) {
      return res.status(404).json({
        error: 'Failed to fetch realtime quote',
      });
    }

    res.json(quote);
  } catch (error) {
    console.error('Error in /api/realtime/quote:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/realtime/batch
 * 批量获取多个股票的实时报价
 */
router.post('/batch', async (req, res) => {
  try {
    const { symbols } = req.body;

    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        error: 'Missing or invalid parameter: symbols (must be an array)',
      });
    }

    const quotes = await getBatchRealtimeQuotes(symbols);

    res.json(quotes);
  } catch (error) {
    console.error('Error in /api/realtime/batch:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
