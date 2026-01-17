
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import positionRoutes from './routes/position.js';
import navigateRoutes from './routes/navigate.js';

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/position', positionRoutes);
app.use('/navigate', navigateRoutes);

app.get('/', (req,res)=>res.send('Backend running'));

app.listen(8000, ()=>console.log('Server running on 8000'));
